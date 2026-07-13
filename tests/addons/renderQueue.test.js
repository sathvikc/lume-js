import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { state } from 'src/core/state.js';
import { batch } from 'src/core/batch.js';
import { computed } from 'src/addons/computed.js';
import { renderQueue } from 'src/addons/renderQueue.js';

// Let the per-state microtask flush run so track effects re-arm.
const flushEffects = () => new Promise((r) => setTimeout(r, 0));

let rafQ;
let ioInstances;

beforeEach(() => {
  rafQ = [];
  vi.stubGlobal('requestAnimationFrame', (fn) => {
    rafQ.push(fn);
    return rafQ.length;
  });

  ioInstances = [];
  vi.stubGlobal('IntersectionObserver', class {
    constructor(cb) {
      this.cb = cb;
      this.observed = new Set();
      this.unobserved = new Set();
      ioInstances.push(this);
    }
    observe(el) { this.observed.add(el); }
    unobserve(el) { this.unobserved.add(el); }
    fire(entries) { this.cb(entries); } // test helper
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

// Run exactly one scheduled frame (FIFO).
function runFrame() {
  const fn = rafQ.shift();
  if (fn) fn();
  return !!fn;
}

// Run frames until the queue stops rescheduling (bounded).
function runToIdle(max = 50) {
  let i = 0;
  while (rafQ.length && i < max) { runFrame(); i++; }
}

const lastIO = () => ioInstances[ioInstances.length - 1];

// Schedule N auto-tier entries tracking store.n; return their apply-order sink.
function scheduleMany(queue, store, count, sink, opts = {}) {
  for (let i = 0; i < count; i++) {
    const el = document.createElement('div');
    queue.schedule({ el, track: () => store.n, apply: () => sink.push(i), ...opts });
  }
}

describe('renderQueue', () => {
  it('paints immediately on schedule, once, and queues nothing (honest backlog)', () => {
    const store = state({ hue: 10 });
    const el = document.createElement('div');
    const applied = [];
    const queue = renderQueue();

    queue.schedule({ el, track: () => store.hue, apply: () => applied.push(store.hue) });

    expect(applied).toEqual([10]); // sync, exactly once
    expect(queue.size).toBe(0);    // nothing pending — we just painted
    expect(rafQ).toHaveLength(0);  // no frame scheduled at registration
  });

  it('coalesces multiple writes between frames into one apply with the latest value', async () => {
    const store = state({ hue: 1 });
    const el = document.createElement('div');
    const applied = [];
    const queue = renderQueue();

    queue.schedule({ el, track: () => store.hue, apply: () => applied.push(store.hue) });

    store.hue = 2;
    store.hue = 3;
    await flushEffects();
    expect(queue.size).toBe(1); // one dirty entry, both writes coalesced
    runToIdle();

    expect(applied).toEqual([1, 3]); // initial paint + one drain at the latest value
  });

  it('exposes size as the live backlog and flush() drains it ignoring budget', async () => {
    const store = state({ n: 0 });
    const queue = renderQueue({ budgetMs: 2 });
    const applied = [];
    scheduleMany(queue, store, 5, applied);
    applied.length = 0; // ignore the 5 initial paints

    store.n = 1;
    await flushEffects();
    expect(queue.size).toBe(5);

    queue.flush();
    expect(queue.size).toBe(0);
    expect(applied).toHaveLength(5);
  });

  it('stops at the frame budget and reschedules the remainder (nothing lost)', async () => {
    const store = state({ n: 0 });
    const queue = renderQueue({ budgetMs: 2 });
    const applied = [];
    scheduleMany(queue, store, 12, applied);
    applied.length = 0;

    store.n = 1;
    await flushEffects();

    // t0 = 0; the every-8th check (n=8) sees now=100 > budget → stop.
    vi.spyOn(performance, 'now').mockReturnValueOnce(0).mockReturnValueOnce(100);
    runFrame();
    expect(applied).toHaveLength(8);
    expect(queue.size).toBe(4);
    expect(rafQ.length).toBe(1); // remainder rescheduled

    vi.restoreAllMocks();
    runToIdle();
    expect(queue.size).toBe(0);
    expect(applied).toHaveLength(12);
  });

  it('preempts the drain when input is pending', async () => {
    vi.stubGlobal('navigator', { scheduling: { isInputPending: () => true } });
    const store = state({ n: 0 });
    const queue = renderQueue({ budgetMs: 1000 }); // budget never trips; only input does
    const applied = [];
    scheduleMany(queue, store, 12, applied);
    applied.length = 0;

    store.n = 1;
    await flushEffects();
    runFrame();
    expect(applied).toHaveLength(8); // stopped at the n=8 input check
    expect(rafQ.length).toBe(1);
  });

  it('treats an absent navigator and a scheduling API without isInputPending as no pending input', async () => {
    vi.stubGlobal('navigator', { scheduling: {} }); // present but no isInputPending
    const store = state({ n: 0 });
    const q1 = renderQueue({ budgetMs: 1000 });
    const a1 = [];
    scheduleMany(q1, store, 12, a1);
    a1.length = 0;
    store.n = 1;
    await flushEffects();
    runFrame();
    expect(a1).toHaveLength(12); // no preemption

    vi.stubGlobal('navigator', undefined); // navigator entirely absent
    const store2 = state({ n: 0 });
    const q2 = renderQueue({ budgetMs: 1000 });
    const a2 = [];
    scheduleMany(q2, store2, 12, a2);
    a2.length = 0;
    store2.n = 1;
    await flushEffects();
    runFrame();
    expect(a2).toHaveLength(12);
  });

  it('drains visible entries before offscreen ones', async () => {
    const store = state({ n: 0 });
    const queue = renderQueue({ budgetMs: 1000 });
    const order = [];
    const hidden = document.createElement('div');
    const shown = document.createElement('div');
    queue.schedule({ el: hidden, track: () => store.n, apply: () => order.push('hidden') });
    queue.schedule({ el: shown, track: () => store.n, apply: () => order.push('shown') });
    order.length = 0;

    lastIO().fire([{ target: hidden, isIntersecting: false }]);
    store.n = 1;
    await flushEffects();
    runFrame();
    expect(order).toEqual(['shown', 'hidden']); // visible-first
  });

  it('honours priority: high beats visible-auto, idle runs last, data-priority ancestor resolves, option beats attribute', async () => {
    const store = state({ n: 0 });
    const queue = renderQueue({ budgetMs: 1000 });
    const order = [];

    const high = document.createElement('div');
    const auto = document.createElement('div');
    const idle = document.createElement('div');

    const lowWrap = document.createElement('div');
    lowWrap.setAttribute('data-priority', 'low');
    const lowChild = document.createElement('span');
    lowWrap.appendChild(lowChild);

    const overrideWrap = document.createElement('div');
    overrideWrap.setAttribute('data-priority', 'idle');
    const overrideChild = document.createElement('span');
    overrideWrap.appendChild(overrideChild);

    queue.schedule({ el: idle, priority: 'idle', track: () => store.n, apply: () => order.push('idle') });
    queue.schedule({ el: auto, track: () => store.n, apply: () => order.push('auto') });
    queue.schedule({ el: high, priority: 'high', track: () => store.n, apply: () => order.push('high') });
    queue.schedule({ el: lowChild, track: () => store.n, apply: () => order.push('low') });
    queue.schedule({ el: overrideChild, priority: 'high', track: () => store.n, apply: () => order.push('override') });
    order.length = 0;

    store.n = 1;
    await flushEffects();
    runFrame();
    expect(order).toEqual(['high', 'override', 'auto', 'low', 'idle']);
  });

  it('resolves auto for an unknown data-priority value and for an el without closest()', async () => {
    const store = state({ n: 0 });
    const queue = renderQueue({ budgetMs: 1000 });
    const order = [];

    const wrap = document.createElement('div');
    wrap.setAttribute('data-priority', 'bogus'); // not a real tier → auto
    const child = document.createElement('span');
    wrap.appendChild(child);

    const bareEl = { style: {} }; // object el with no closest()

    queue.schedule({ el: child, track: () => store.n, apply: () => order.push('attr') });
    queue.schedule({ el: bareEl, track: () => store.n, apply: () => order.push('bare') });
    order.length = 0;

    store.n = 1;
    await flushEffects();
    runFrame();
    expect(order.sort()).toEqual(['attr', 'bare']); // both drained as auto
  });

  it('does not starve: only the re-dirtied entry drains, preserving FIFO within its tier', async () => {
    const store = state({ a: 0, b: 0 });
    const queue = renderQueue({ budgetMs: 1000 });
    const order = [];
    const elA = document.createElement('div');
    const elB = document.createElement('div');
    queue.schedule({ el: elA, track: () => store.a, apply: () => order.push('A') });
    queue.schedule({ el: elB, track: () => store.b, apply: () => order.push('B') });
    order.length = 0;

    store.a = 1; // re-dirty A only
    await flushEffects();
    runFrame();
    expect(order).toEqual(['A']);
  });

  it('logs and survives an apply() that throws — at registration and in the drain — keeping the entry subscribed', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const store = state({ n: 0 });
    const queue = renderQueue({ budgetMs: 1000 });
    const good = [];
    const bad = document.createElement('div');
    const ok = document.createElement('div');
    let boom = true;
    queue.schedule({
      el: bad,
      track: () => store.n,
      apply: () => { if (boom) throw new Error('kaboom'); },
    });
    queue.schedule({ el: ok, track: () => store.n, apply: () => good.push(store.n) });
    expect(spy).toHaveBeenCalledTimes(1); // the initial paint threw and was logged
    good.length = 0;

    store.n = 1;
    await flushEffects();
    runFrame();
    expect(good).toEqual([1]); // the sibling still drained
    expect(queue.size).toBe(0);

    boom = false; // thrower re-queues on the next change and succeeds
    store.n = 2;
    await flushEffects();
    expect(queue.size).toBe(2); // both entries track store.n, so both re-arm
    runFrame();
    expect(queue.size).toBe(0);
  });

  it('dispose() stops applies, is safe after a drain, and unobserves the element', async () => {
    const store = state({ n: 0 });
    const queue = renderQueue({ budgetMs: 1000 });
    const applied = [];
    const el = document.createElement('div');
    const stop = queue.schedule({ el, track: () => store.n, apply: () => applied.push(store.n) });
    applied.length = 0;

    stop();
    expect(lastIO().unobserved.has(el)).toBe(true);
    expect(queue.size).toBe(0);

    store.n = 5;
    await flushEffects();
    runToIdle();
    expect(applied).toEqual([]); // no applies after dispose
  });

  it('works without IntersectionObserver: every entry is treated as visible', async () => {
    vi.stubGlobal('IntersectionObserver', undefined);
    const store = state({ n: 0 });
    const queue = renderQueue({ budgetMs: 1000 });
    const order = [];
    const a = document.createElement('div');
    const b = document.createElement('div');
    const stopA = queue.schedule({ el: a, track: () => store.n, apply: () => order.push('a') });
    queue.schedule({ el: b, track: () => store.n, apply: () => order.push('b') });
    order.length = 0;

    store.n = 1;
    await flushEffects();
    runFrame();
    expect(order).toEqual(['a', 'b']);
    expect(() => stopA()).not.toThrow(); // dispose with no IO is a safe no-op
  });

  it('falls back to setTimeout when requestAnimationFrame is absent', async () => {
    vi.stubGlobal('requestAnimationFrame', undefined);
    const store = state({ n: 0 });
    const queue = renderQueue({ budgetMs: 1000 });
    const applied = [];
    const el = document.createElement('div');
    queue.schedule({ el, track: () => store.n, apply: () => applied.push(store.n) });
    applied.length = 0;

    // Effects flush on microtasks; drive them without a timer, then fake-time the drain.
    vi.useFakeTimers();
    store.n = 1;
    await Promise.resolve();
    await Promise.resolve();
    expect(applied).toEqual([]); // setTimeout(drain, 16) queued but not fired
    vi.advanceTimersByTime(16);
    expect(applied).toEqual([1]);
    vi.useRealTimers();
  });

  it('uses Date.now() when performance is unavailable', async () => {
    vi.stubGlobal('performance', undefined);
    const store = state({ n: 0 });
    const queue = renderQueue({ budgetMs: 1000 });
    const applied = [];
    const el = document.createElement('div');
    queue.schedule({ el, track: () => store.n, apply: () => applied.push(store.n) });
    applied.length = 0;
    store.n = 1;
    await flushEffects();
    expect(() => runFrame()).not.toThrow();
    expect(applied).toEqual([1]);
  });

  it('skips the idle tier when the frame goes over budget', async () => {
    const store = state({ n: 0 });
    const queue = renderQueue({ budgetMs: 2 });
    const order = [];
    scheduleMany(queue, store, 12, order); // forces an over-budget stop before idle
    const idleEl = document.createElement('div');
    queue.schedule({ el: idleEl, priority: 'idle', track: () => store.n, apply: () => order.push('idle') });
    order.length = 0;

    store.n = 1;
    await flushEffects();
    vi.spyOn(performance, 'now').mockReturnValueOnce(0).mockReturnValueOnce(100);
    runFrame();
    expect(order).not.toContain('idle'); // budget tripped → idle deferred
  });

  it('skips the idle tier when input is pending even under budget', async () => {
    vi.stubGlobal('navigator', { scheduling: { isInputPending: () => true } });
    const store = state({ n: 0 });
    const queue = renderQueue({ budgetMs: 1000 });
    const order = [];
    const idleEl = document.createElement('div');
    queue.schedule({ el: idleEl, priority: 'idle', track: () => store.n, apply: () => order.push('idle') });
    order.length = 0;
    store.n = 1;
    await flushEffects();
    runFrame();
    expect(order).not.toContain('idle');
  });

  it('defaults a bad or missing budgetMs', () => {
    for (const bad of [{ budgetMs: 0 }, { budgetMs: -5 }, { budgetMs: NaN }, undefined]) {
      const queue = renderQueue(bad);
      const el = document.createElement('div');
      const applied = [];
      expect(() => queue.schedule({ el, track: () => {}, apply: () => applied.push(1) })).not.toThrow();
      expect(applied).toEqual([1]);
    }
  });

  it('validates the entry shape', () => {
    const queue = renderQueue();
    const el = document.createElement('div');
    expect(() => queue.schedule()).toThrow(/renderQueue\(\): schedule\(\) requires an el/);
    expect(() => queue.schedule({ track: () => {}, apply: () => {} })).toThrow(/requires an el/);
    expect(() => queue.schedule({ el, apply: () => {} })).toThrow(/requires a track function/);
    expect(() => queue.schedule({ el, track: () => {} })).toThrow(/requires an apply function/);
  });

  it('coalesces a batch() of writes into a single drain and works with computed as the tracked read', async () => {
    const store = state({ a: 1, b: 2 });
    const doubled = computed(() => store.a * 2);
    await flushEffects(); // let computed's re-entry guard clear before we mutate

    const queue = renderQueue({ budgetMs: 1000 });
    const applied = [];
    const el = document.createElement('div');
    queue.schedule({ el, track: () => doubled.value + store.b, apply: () => applied.push([doubled.value, store.b]) });
    applied.length = 0;

    batch(() => {
      store.a = 10;
      store.b = 20;
    });
    await flushEffects();
    expect(queue.size).toBe(1); // both writes → one dirty entry
    runToIdle();
    expect(applied).toEqual([[20, 20]]); // one apply reading current values
  });
});
