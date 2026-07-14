// render-queue-lab round-2 experiments — the follow-ups behind the revised
// verdict. Requires the dev server (port 5199) and playwright-core (see
// run.mjs). `node round2.mjs [starve|compare|fidelity|all]`.
//
//   starve   — under uniform storm, how evenly are cells painted? Proves the
//              renderQueue starvation bug (paints ~16/3000, rest starve) and
//              that the round-robin `bounded` cursor and `pull` do not.
//   compare  — median input, frame gap, staleness, starvation across all modes
//              incl. the new `bounded` (cursor fix) and `pull` (no-flush) modes.
//   fidelity — rq-vs-off input ratio HEADLESS vs HEADED (run under xvfb-run for
//              headed): does a real compositor change renderQueue's benefit?

import { chromium } from 'playwright-core';
import { runCase } from './run.mjs';

const BASE = 'http://localhost:5199/examples/render-queue-lab/';

async function starve() {
  console.log('\n# starve — cells painted under uniform storm (10s window)');
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
  for (const mode of ['rq', 'simple', 'bounded', 'pull']) {
    const page = await browser.newPage();
    await page.goto(`${BASE}?mode=${mode}&regime=storm&cells=3000&dot=0`, { waitUntil: 'load' });
    await page.waitForFunction(() => window.__lab);
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 20 });
    await page.evaluate(() => window.__lab.start());
    await new Promise((r) => setTimeout(r, 2000));
    await page.evaluate(() => window.__lab.reset());
    await new Promise((r) => setTimeout(r, 10000));
    const s = await page.evaluate(() => window.__lab.snapshot());
    await page.close();
    const st = s.starvation;
    console.log(`  ${mode.padEnd(8)} painted ${st.total - st.zeroCount}/${st.total}  applies/cell ${st.min}-${st.max}  maxStale=${Math.round(s.maxStaleness)}ms`);
  }
  await browser.close();
}

async function compare() {
  console.log('\n# compare — median input / frame / staleness / starvation, all modes');
  const base = { cells: 3000, budget: 2, churn: 0.08, rate: 20, warmup: 1500, measure: 6000, type: true, dot: 0, text: 1 };
  for (const regime of ['storm', 'dashboard']) {
    console.log(`  --- ${regime} ---`);
    for (const mode of ['off', 'rq', 'simple', 'bounded', 'pull', 'cv']) {
      const r = await runCase({ ...base, mode, regime });
      const st = r.starvation || {};
      console.log(`  ${mode.padEnd(8)} in.med=${String(r.inputDelay.median).padStart(6)}  frameMed=${String(r.frame.medianGap).padStart(6)}  starved=${String(st.zeroCount ?? '-').padStart(4)}/${st.total ?? '-'}  maxStale=${String(r.maxStalenessMs).padStart(6)}`);
    }
  }
}

async function fidelity() {
  console.log('\n# fidelity — rq/off input ratio, headless vs headed (run under xvfb-run for headed)');
  const base = { regime: 'dashboard', cells: 3000, budget: 2, churn: 0.08, rate: 20, warmup: 1500, measure: 6000, type: true, dot: 0, text: 0 };
  for (const headed of [false, true]) {
    const off = await runCase({ ...base, mode: 'off', headed });
    const rq = await runCase({ ...base, mode: 'rq', headed });
    console.log(`  ${headed ? 'HEADED ' : 'HEADLESS'}  off=${off.inputDelay.median}  rq=${rq.inputDelay.median}  ratio=${(off.inputDelay.median / rq.inputDelay.median).toFixed(2)}x  (throttle off=${off.throttle.effectiveSlowdown} rq=${rq.throttle.effectiveSlowdown})`);
  }
}

const which = process.argv[2] || 'all';
if (which === 'starve' || which === 'all') await starve();
if (which === 'compare' || which === 'all') await compare();
if (which === 'fidelity' || which === 'all') await fidelity();
