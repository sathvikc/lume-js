// render-queue-lab GENERIC CPU profiler — use this to find the hot function of
// any mode/regime instead of writing a profiler each time. Prints self-time %
// by function (name + file:line), which is how the kernel write-path floor was
// found in Round 5.
//
//   node profile.mjs --mode sliced --regime dashboard --cells 3000 [--rate 20]
//     [--dot 0] [--render 1] [--warmup 1500] [--sample 5000] [--top 15]
//
// Requires the dev server (5199) and playwright-core.

import { chromium } from 'playwright-core';

function parse(argv) {
  const a = { mode: 'off', regime: 'dashboard', cells: 3000, budget: 2, churn: 0.08,
    rate: 20, dot: 0, text: 1, render: 1, warmup: 1500, sample: 5000, top: 15 };
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i].replace(/^--/, ''); const v = argv[++i];
    if (k in a) a[k] = /^\d/.test(v) || v === '0' ? Number(v) : v;
  }
  return a;
}
const a = parse(process.argv.slice(2));
const BASE = 'http://localhost:5199/examples/render-queue-lab/';

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
const page = await browser.newPage();
const url = `${BASE}?mode=${a.mode}&regime=${a.regime}&cells=${a.cells}&budget=${a.budget}&churn=${a.churn}&dot=${a.dot}&text=${a.text}&render=${a.render}`;
await page.goto(url, { waitUntil: 'load' });
await page.waitForFunction(() => window.__lab);
const cdp = await page.context().newCDPSession(page);
if (a.rate > 1) await cdp.send('Emulation.setCPUThrottlingRate', { rate: a.rate });
await cdp.send('Profiler.enable');
await cdp.send('Profiler.setSamplingInterval', { interval: 200 });
await page.evaluate(() => window.__lab.start());
await new Promise((r) => setTimeout(r, a.warmup));
await cdp.send('Profiler.start');
await new Promise((r) => setTimeout(r, a.sample));
const { profile } = await cdp.send('Profiler.stop');
await browser.close();

const selfHits = new Map();
for (const n of profile.nodes) {
  const f = n.callFrame;
  const key = `${f.functionName || '(anonymous)'}  ${(f.url || '').split('/').pop() || ':native'}:${f.lineNumber + 1}`;
  selfHits.set(key, (selfHits.get(key) || 0) + (n.hitCount || 0));
}
const total = [...selfHits.values()].reduce((x, y) => x + y, 0) || 1;
console.log(`profile: ${a.mode}/${a.regime} ${a.cells} cells @ ${a.rate}x — ${total} samples (~${(total * 0.2) | 0}ms active)`);
for (const [k, v] of [...selfHits.entries()].sort((x, y) => y[1] - x[1]).slice(0, a.top)) {
  console.log(`${(100 * v / total).toFixed(1).padStart(5)}%  ${String(v).padStart(6)}  ${k}`);
}
