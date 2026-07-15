// render-queue-lab worker — the mode=worker off-main-thread render pipeline.
//
// This is the architectural probe the study kept deferring (HANDOFF item 8 /
// next-step (e)): move the WHOLE render pipeline off the main thread. The worker
// owns the cell values, generates the regime writes (producer), diffs against the
// last painted value, and paints changed cells into an OffscreenCanvas — all on a
// worker thread. The main thread does ZERO per-frame work, so its input delay is
// measured against a nearly-idle thread. That is the thesis: off-threading trades
// "one thread doing produce+diff+paint+input" for "input alone on the main thread,
// everything else parallel."
//
// The one measurement that decides the verdict is whether CDP CPU throttling
// (Emulation.setCPUThrottlingRate) even reaches this worker thread. It might not
// (workers run on separate OS threads). So the worker runs its OWN 2M-iteration
// busy-probe — native at init (before the driver applies the throttle) and again
// at 'start' (after) — and ships both back, exactly like run.mjs does for the main
// thread. Every result is then self-describing: if the worker slowdown is ~1x the
// paint numbers are unthrottled and must be read as "separate core" (real-hardware
// analogue); if it is ~20x the worker paints under the same throttle as the DOM
// modes and the comparison to the 16 ms canvas floor is apples-to-apples.
//
// No Lume imports: the worker holds plain arrays. This is `plain` (no state()) but
// off-thread — deliberately, because the first question is the CEILING (is off-
// threading worth a big architectural bet at all), not how reactive state would be
// fed across the postMessage boundary. That integration is only worth designing if
// the ceiling proves out.

let ctx = null;
let count = 0, cols = 0, gap = 1, cellW = 0, cellH = 0;
let text = 1, render = 1, budgetMs = 0, churn = 0.08, regime = 'storm';
// pipeline: 'full' = the worker owns produce+diff+paint (mode=worker, the ceiling
// probe); 'push' = the MAIN thread keeps reactive state, diffs, and posts changed
// cells here to blit (mode=whybrid, the realistic Lume-integration cost). In push
// mode this worker is a dumb blitter — the interesting number is the MAIN thread's
// input delay, i.e. what the per-frame diff+serialize+postMessage costs it.
let pipeline = 'full';
// Software slow-device emulation. CDP CPU throttling does NOT reach a dedicated
// worker (confirmed: the driver can't attach an Emulation session to the worker
// target, and this worker's own busy-probe reads ~1× under the page throttle), so
// a bare worker run compares a throttled main thread against a native-speed worker.
// softThrottle > 1 stretches each frame with a busy-loop so its wall time is R× its
// measured compute — the same "make CPU time R× longer" mechanism CDP applies to
// the main thread, at frame granularity (fine here: a worker has no input to
// preempt). This lets us report the honest slow-device bound, not just the free-core one.
let softThrottle = 1;
let vals = null, last = null;
let running = false;
let cursor = 0;
let applied = 0;

// Paint-frame timings since the last reset (the worker's "fps"/freshness signal).
let frameTimes = [];
let worstPaint = 0;
let paints = 0;
let resetAt = 0;
let nativeMs = null, throttledMs = null;
let loopHandle = 0;

// Dedicated workers do not implement requestAnimationFrame, so the loop self-
// schedules on a ~16 ms setTimeout cadence: when a frame fits, the next fires at
// the next ~16 ms tick (≈60 fps); when it overruns under throttle, the next fires
// immediately, so the worker runs flat-out — the same back-to-back behaviour rAF
// gives on the main thread when frames are long.

function busyProbe() {
  const t0 = performance.now();
  let x = 0;
  for (let i = 0; i < 2_000_000; i++) x += i % 7;
  return performance.now() - t0;
}

function nextVal(v) {
  let n = v + (Math.random() * 24 - 12);
  if (n < 0) n = -n;
  if (n > 100) n = 200 - n;
  return n;
}

// Mirror the main-thread producer regimes byte-for-byte (nextVal, churn fraction,
// full-grid storm) so worker-vs-canvas is an honest thread comparison, not a
// different workload.
function produce() {
  if (regime === 'dashboard') {
    const k = Math.max(1, Math.round(count * churn));
    for (let j = 0; j < k; j++) { const i = (Math.random() * count) | 0; vals[i] = nextVal(vals[i]); }
  } else {
    // storm and burst both write the whole grid; burst produces once (see onStart).
    for (let i = 0; i < count; i++) vals[i] = nextVal(vals[i]);
  }
}

// One cell → one filled rect (+ optional number). Identical string work to the
// main-thread canvas mode (hsl(...) + integer text) so the paint cost matches.
function paintCell(i) {
  const v = vals[i];
  const col = i % cols;
  const row = (i / cols) | 0;
  const x = col * (cellW + gap);
  const y = row * (cellH + gap);
  ctx.fillStyle = `hsl(${(v * 3.6) | 0} 75% 55%)`;
  ctx.fillRect(x, y, cellW, cellH);
  if (text) {
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillText(String(v | 0), x + 1, y + cellH - 3);
  }
  applied++;
}

// The pipeline loop: produce → cursor-fair diff → paint every changed cell. Unlike
// the main-thread pull family it does NOT budget-cap the paint: the worker is not
// competing with input, so it paints everything changed each frame to keep pixels
// as fresh as its thread allows. The per-frame paint duration IS the freshness
// measure — if it stays near the 16 ms canvas floor, off-threading holds it.
function loop() {
  loopHandle = 0;
  const t0 = performance.now();
  if (running) produce();
  if (render) {
    let seen = 0;
    while (seen < count) {
      const i = cursor; cursor = (cursor + 1) % count; seen++;
      if (vals[i] !== last[i]) {
        last[i] = vals[i];
        paintCell(i);
        if (budgetMs > 0 && (applied & 7) === 0 && performance.now() - t0 > budgetMs) break;
      }
    }
  }
  const compute = performance.now() - t0;
  // Slow-device emulation: stretch this frame's wall time to R× its compute, so the
  // recorded frame time reflects what this paint pipeline would cost on a device
  // whose worker core is R× slower — the apples-to-apples comparison to the CDP-
  // throttled DOM modes. When softThrottle == 1 this is a no-op (native/free core).
  if (softThrottle > 1) {
    const target = t0 + compute * softThrottle;
    let x = 0;
    while (performance.now() < target) { for (let k = 0; k < 5000; k++) x += k % 7; }
    if (x === -1) self.__x = x; // defeat dead-code elimination
  }
  const dur = performance.now() - t0; // includes the stretch — the throttled frame cost
  frameTimes.push(dur);
  if (frameTimes.length > 600) frameTimes.shift();
  if (dur > worstPaint) worstPaint = dur;
  paints++;
  // ~16 ms cadence; when a frame overruns (throttled), the next runs immediately.
  const wait = Math.max(0, 16 - (performance.now() - t0));
  loopHandle = setTimeout(loop, wait);
}

function resetStats() {
  frameTimes = [];
  worstPaint = 0;
  paints = 0;
  applied = 0;
  resetAt = performance.now();
}

function pct(arr, p) {
  if (!arr.length) return null;
  const s = arr.slice().sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor((p / 100) * s.length))];
}

function postStats() {
  const now = performance.now();
  const wall = now - resetAt;
  self.postMessage({
    type: 'stats',
    fps: wall > 0 ? Math.round((paints * 1000) / wall * 10) / 10 : null,
    worstPaintMs: Math.round(worstPaint * 10) / 10,
    medianPaintMs: frameTimes.length ? Math.round(pct(frameTimes, 50) * 10) / 10 : null,
    p95PaintMs: frameTimes.length ? Math.round(pct(frameTimes, 95) * 10) / 10 : null,
    paints,
    applied,
    // Everything changed is painted each frame, so a nonzero residual only appears
    // mid-frame; report cells whose current value is unpainted as the backlog.
    backlog: residualBacklog(),
    softThrottle,
    probe: { nativeMs, throttledMs, slowdown: (nativeMs && throttledMs) ? Math.round(throttledMs / nativeMs * 10) / 10 : null },
  });
}

function residualBacklog() {
  if (pipeline === 'push') return 0; // push mode: the main thread owns the backlog
  if (!vals || !last) return 0;
  let behind = 0;
  for (let i = 0; i < count; i++) if (vals[i] !== last[i]) behind++;
  return behind;
}

let statsTimer = 0;

self.onmessage = (e) => {
  const m = e.data;
  if (m.type === 'init') {
    const canvas = m.canvas;
    ctx = canvas.getContext('2d');
    count = m.count; cols = m.cols; gap = m.gap;
    cellW = m.cellW; cellH = m.cellH;
    text = m.text; render = m.render; budgetMs = m.budgetMs;
    churn = m.churn; regime = m.regime;
    softThrottle = m.softThrottle || 1;
    pipeline = m.pipeline || 'full';
    ctx.font = '7px system-ui, sans-serif';
    ctx.textBaseline = 'alphabetic';
    vals = new Float64Array(count);
    last = new Float64Array(count);
    for (let i = 0; i < count; i++) { vals[i] = Math.random() * 100; last[i] = vals[i]; }
    // Native throttle baseline: init runs BEFORE the driver applies the CPU
    // throttle, so this probe captures the worker's un-throttled speed.
    nativeMs = Math.round(busyProbe() * 10) / 10;
    // Paint the initial frame so the canvas isn't blank before start().
    if (render) for (let i = 0; i < count; i++) paintCell(i);
    resetStats();
    // push (hybrid): the main thread drives; start the stats poller now and wait
    // for 'paint' batches. There is no self-scheduled loop.
    if (pipeline === 'push' && !statsTimer) statsTimer = setInterval(postStats, 200);
    self.postMessage({ type: 'ready', nativeMs });
    return;
  }
  if (m.type === 'paint') {
    // Hybrid push: main thread sent a batch of changed cells as a flat Float32
    // buffer [i0, v0, i1, v1, …] (transferred, zero-copy). Blit each; the worker's
    // recorded frame time here is just the blit cost (the cheap part).
    const arr = new Float32Array(m.buf);
    const t0 = performance.now();
    if (render) {
      for (let j = 0; j < m.n; j++) { const i = arr[2 * j] | 0; vals[i] = arr[2 * j + 1]; paintCell(i); }
    }
    const dur = performance.now() - t0;
    frameTimes.push(dur);
    if (frameTimes.length > 600) frameTimes.shift();
    if (dur > worstPaint) worstPaint = dur;
    paints++;
    return;
  }
  if (m.type === 'start') {
    // Now the throttle (if any) is active — re-probe to see if it reached us.
    throttledMs = Math.round(busyProbe() * 10) / 10;
    if (regime === 'burst') { produce(); running = false; }
    else running = true;
    resetStats();
    if (!loopHandle) loop();
    if (!statsTimer) statsTimer = setInterval(postStats, 200);
    return;
  }
  if (m.type === 'reset') { resetStats(); return; }
  if (m.type === 'stop') {
    running = false;
    postStats();
    return;
  }
};
