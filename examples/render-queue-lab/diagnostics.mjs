// render-queue-lab diagnostics — the three mechanism experiments behind
// FINDINGS.md. Run with the dev server up (port 5199) and playwright-core
// installed (see run.mjs header). `node diagnostics.mjs [floor|render|stale|all]`.
//
//   floor  — quiet-mode fps (zero writes) across cell counts, dot on vs off:
//            locates the per-frame rendering floor and exposes the dot artifact.
//   render — OFF frame gap with render=1 (flush + DOM) vs render=0 (flush only):
//            splits the frame into effect-flush cost vs browser-rendering cost.
//   stale  — long-window staleness trajectory, rq vs simple under storm:
//            rq grows unbounded (freeze); simple plateaus at ~1-2 frames.

import { chromium } from 'playwright-core';

const BASE = 'http://localhost:5199/examples/render-queue-lab/';
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });

async function withPage(query, fn) {
  const page = await browser.newPage();
  await page.goto(`${BASE}?${query}`, { waitUntil: 'load' });
  await page.waitForFunction(() => window.__lab);
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 20 });
  const r = await fn(page);
  await page.close();
  return r;
}

const sum = (a) => a.reduce((s, v) => s + v, 0);
const median = (a) => a.slice().sort((x, y) => x - y)[Math.floor(a.length / 2)] || 0;

async function floor() {
  console.log('\n# floor — quiet fps (no writes), dot on vs off');
  for (const cells of [200, 800, 1500, 3000]) {
    const line = [];
    for (const dot of [1, 0]) {
      const r = await withPage(`mode=off&regime=quiet&cells=${cells}&dot=${dot}`, (page) =>
        page.evaluate(() => new Promise((res) => {
          let n = 0; const t0 = performance.now();
          const tick = () => { n++; const el = performance.now() - t0; if (el < 4000) requestAnimationFrame(tick); else res(+(n * 1000 / el).toFixed(1)); };
          requestAnimationFrame(tick);
        })));
      line.push(`dot=${dot}:${r}fps`);
    }
    console.log(`  cells=${String(cells).padStart(4)}  ${line.join('  ')}`);
  }
}

async function render() {
  console.log('\n# render — OFF frame gap, flush+DOM (render=1) vs flush-only (render=0)');
  for (const regime of ['dashboard', 'storm']) {
    for (const r of [1, 0]) {
      const snap = await withPage(`mode=off&regime=${regime}&cells=3000&dot=0&render=${r}`, async (page) => {
        await page.evaluate(() => window.__lab.start());
        await new Promise((res) => setTimeout(res, 5000));
        return page.evaluate(() => window.__lab.snapshot());
      });
      console.log(`  ${regime.padEnd(9)} render=${r}  medGap=${Math.round(median(snap.frameGaps))}ms  frames=${snap.frameGaps.length}  applied=${snap.appliedCount}`);
    }
  }
}

async function stale() {
  console.log('\n# stale — staleness trajectory under storm (dot off), rq vs simple');
  for (const mode of ['rq', 'simple']) {
    const out = await withPage(`mode=${mode}&regime=storm&cells=3000&dot=0`, async (page) => {
      await page.evaluate(() => window.__lab.start());
      const t0 = Date.now(); const acc = [];
      for (let s = 0; s < 8; s++) {
        await new Promise((r) => setTimeout(r, 2000));
        const snap = await page.evaluate(() => window.__lab.snapshot());
        acc.push(`${((Date.now() - t0) / 1000).toFixed(0)}s:bl=${snap.currentBacklog},stale=${Math.round(snap.maxStaleness)}ms`);
      }
      return acc;
    });
    console.log(`  ${mode.padEnd(7)} ${out.join('  ')}`);
  }
}

const which = process.argv[2] || 'all';
if (which === 'floor' || which === 'all') await floor();
if (which === 'render' || which === 'all') await render();
if (which === 'stale' || which === 'all') await stale();
await browser.close();
