// render-queue-lab driver — drives one measurement case in throttled Chromium.
//
// Requires playwright-core (NOT a project dependency — research-only tooling):
//   PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 npm i --no-save playwright-core
// or point NODE_PATH at an install that has it. Uses the pre-installed browser
// at /opt/pw-browsers/chromium; do not run `playwright install`.
//
// Every case verifies the CPU throttle with a 2M-iteration busy-loop probe
// (warm native ~7ms; at rate 20 the effective slowdown lands ~19x here) and
// records it alongside the numbers so results are self-describing.
//
// CLI: node run.mjs --mode rq --regime storm --cells 3000 [--budget 2]
//      [--churn 0.08] [--rate 20] [--warmup 1500] [--measure 5000]
//      [--type] [--converge] [--out results/foo.json]
//
// Metrics per case: worst + p95 input delay (Event Timing, threshold 16ms,
// processingStart - startTime), p95/worst frame gap, fps, peak backlog, max
// staleness, and (with --converge) time for the backlog to reach 0 after load
// stops.

import { chromium } from 'playwright-core';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const EXEC = '/opt/pw-browsers/chromium';
const BASE = process.env.LAB_BASE || 'http://localhost:5199/examples/render-queue-lab/';

export function parseArgs(argv) {
  const a = { mode: 'off', regime: 'storm', cells: 3000, budget: 2, churn: 0.08,
    rate: 20, warmup: 1500, measure: 5000, type: false, converge: false, dot: 1, text: 1, render: 1, headed: false, out: null };
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i];
    if (k === '--type') { a.type = true; continue; }
    if (k === '--converge') { a.converge = true; continue; }
    if (k === '--nodot') { a.dot = 0; continue; }
    if (k === '--notext') { a.text = 0; continue; }
    if (k === '--headed') { a.headed = true; continue; }
    if (k === '--burst-type') { a.typeBursty = true; continue; }
    if (k === '--norender') { a.render = 0; continue; }
    const v = argv[++i];
    if (k === '--mode') a.mode = v;
    else if (k === '--regime') a.regime = v;
    else if (k === '--cells') a.cells = Number(v);
    else if (k === '--budget') a.budget = Number(v);
    else if (k === '--churn') a.churn = Number(v);
    else if (k === '--rate') a.rate = Number(v);
    else if (k === '--warmup') a.warmup = Number(v);
    else if (k === '--measure') a.measure = Number(v);
    else if (k === '--out') a.out = v;
  }
  return a;
}

const pct = (arr, p) => {
  if (!arr.length) return null;
  const s = arr.slice().sort((x, y) => x - y);
  return s[Math.min(s.length - 1, Math.floor((p / 100) * s.length))];
};
const sum = (arr) => arr.reduce((s, v) => s + v, 0);

async function busyProbe(page) {
  return page.evaluate(() => {
    const t0 = performance.now();
    let x = 0;
    for (let i = 0; i < 2_000_000; i++) x += i % 7;
    return performance.now() - t0;
  });
}

export async function runCase(opts, sharedBrowser) {
  const browser = sharedBrowser || await chromium.launch({
    executablePath: EXEC,
    headless: !opts.headed,
    args: ['--no-sandbox'],
  });
  const page = await browser.newPage();
  try {
    return await runCaseInner(opts, page);
  } finally {
    await page.close().catch(() => {});
    if (!sharedBrowser) await browser.close().catch(() => {});
  }
}

async function runCaseInner(opts, page) {
  page.setDefaultTimeout(60000);
  await page.setViewportSize({ width: 900, height: 700 });
  const errs = [];
  page.on('pageerror', (e) => errs.push(String(e.message)));

  const cdp = await page.context().newCDPSession(page);
  // Warm the JIT for a stable native baseline, then throttle and probe.
  const url = `${BASE}?mode=${opts.mode}&regime=${opts.regime}&cells=${opts.cells}&budget=${opts.budget}&churn=${opts.churn}&dot=${opts.dot}&text=${opts.text}&render=${opts.render}`;
  await page.goto(url, { waitUntil: 'load' });
  await page.waitForFunction(() => window.__lab && window.__lab.cfg);
  for (let i = 0; i < 4; i++) await busyProbe(page);
  const nativeMs = await busyProbe(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: opts.rate });
  const throttledMs = await busyProbe(page);

  await page.focus('input[data-bind="typed"]').catch(() => {});
  // burst's whole point is the one-shot spike at start(): for OFF that spike is
  // a single synchronous multi-second frame INSIDE the start() call, so it must
  // overlap the typing window or the penalty is measured after the fact (i.e.
  // missed). Reset first, then fire start() WITHOUT awaiting so keys dispatched
  // during the block queue and record their true wait. Continuous regimes warm
  // up to steady state and reset before measuring.
  let burstPromise = null;
  if (opts.regime === 'burst') {
    await page.evaluate(() => window.__lab.reset());
    burstPromise = page.evaluate(() => window.__lab.start()).catch(() => {});
  } else {
    await page.evaluate(() => window.__lab.start());
    await page.waitForTimeout(opts.warmup);
    await page.evaluate(() => window.__lab.reset());
  }

  // Measure window. For typing cases, inject real key events at a fixed 100ms
  // cadence via CDP, FIRE-AND-FORGET — never awaiting the renderer. Awaiting a
  // keystroke (page.keyboard.type) deadlocks the driver when a frame is seconds
  // long; the in-page handler records the true queueing delay regardless.
  if (opts.type) {
    const t0 = Date.now();
    while (Date.now() - t0 < opts.measure) {
      // Bursty typing (1.2s typing / 1.2s idle) exercises an input-reserved
      // dynamic budget: it can only show idle catch-up if there are idle gaps.
      // Continuous typing (default) keeps the interaction window always warm.
      const elapsed = Date.now() - t0;
      const idleGap = opts.typeBursty && Math.floor(elapsed / 1200) % 2 === 1;
      if (!idleGap) {
        cdp.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'a', code: 'KeyA', text: 'a', windowsVirtualKeyCode: 65 }).catch(() => {});
        cdp.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'a', code: 'KeyA', windowsVirtualKeyCode: 65 }).catch(() => {});
      }
      await new Promise((r) => setTimeout(r, 100));
    }
  } else {
    await page.waitForTimeout(opts.measure);
  }
  if (burstPromise) await burstPromise;

  const snap = await page.evaluate(() => window.__lab.snapshot());

  // Convergence: stop the load, poll backlog to zero.
  let convergeMs = null;
  if (opts.converge) {
    await page.evaluate(() => window.__lab.stop());
    const t0 = Date.now();
    const cap = 20000;
    while (Date.now() - t0 < cap) {
      const bl = await page.evaluate(() => window.__lab.backlog());
      if (bl === 0) break;
      await page.waitForTimeout(50);
    }
    convergeMs = Date.now() - t0;
  } else {
    await page.evaluate(() => window.__lab.stop());
  }

  // Re-probe throttle after the run to confirm it held (guarded: a saturated
  // post-stop drain can keep the main thread busy).
  const throttledMs2 = await busyProbe(page).catch(() => null);

  const gaps = snap.frameGaps;
  const measureWall = sum(gaps);
  const result = {
    ...opts,
    throttle: {
      rate: opts.rate,
      nativeMs: round1(nativeMs),
      throttledMs: round1(throttledMs),
      throttledMs2: round1(throttledMs2),
      effectiveSlowdown: round1(throttledMs / nativeMs),
    },
    inputDelay: {
      // Primary: performance.now() - event.timeStamp at the handler (queueing delay).
      worst: snap.keyDelays.length ? round1(Math.max(...snap.keyDelays)) : null,
      p95: snap.keyDelays.length ? round1(pct(snap.keyDelays, 95)) : null,
      median: snap.keyDelays.length ? round1(pct(snap.keyDelays, 50)) : null,
      count: snap.keyDelays.length,
      keys: snap.keyCount,
      // Cross-check: Event Timing processingStart - startTime (often under-reports).
      eventWorst: snap.eventDelays.length ? round1(Math.max(...snap.eventDelays)) : null,
      eventCount: snap.eventDelays.length,
    },
    frame: {
      p95Gap: round1(pct(gaps, 95)),
      worstGap: round1(Math.max(...gaps)),
      medianGap: round1(pct(gaps, 50)),
      fps: gaps.length ? round1((gaps.length * 1000) / measureWall) : null,
      frames: gaps.length,
    },
    backlog: { peak: snap.peakBacklog, atEnd: snap.currentBacklog, convergeMs },
    starvation: snap.starvation || null,
    mainThread: snap.longTasks ? {
      longTaskCount: snap.longTasks.count,
      longTaskTotalMs: round1(snap.longTasks.totalMs),
      worstBlockMs: round1(snap.longTasks.maxMs),
      // fraction of the window NOT locked in >50ms blocking tasks (free for input)
      freePct: measureWall > 0 ? round1(100 * (1 - Math.min(1, snap.longTasks.totalMs / measureWall))) : null,
    } : null,
    smartBusyFraction: snap.smartBusyFraction != null ? round1(snap.smartBusyFraction) : null,
    maxProducerMs: snap.maxProducerMs != null ? round1(snap.maxProducerMs) : null,
    maxSliceMs: snap.maxSliceMs != null ? round1(snap.maxSliceMs) : null,
    maxStalenessMs: round1(snap.maxStaleness),
    appliedCount: snap.appliedCount,
    errs,
  };
  return result;
}

function round1(v) { return v == null ? null : Math.round(v * 10) / 10; }

// CLI entry
if (import.meta.url === `file://${process.argv[1]}`) {
  const opts = parseArgs(process.argv.slice(2));
  const res = await runCase(opts);
  const json = JSON.stringify(res, null, 2);
  if (opts.out) {
    const p = resolve(opts.out);
    mkdirSync(dirname(p), { recursive: true });
    writeFileSync(p, json);
  }
  console.log(json);
}
