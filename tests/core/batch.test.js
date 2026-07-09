/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi } from 'vitest';
import { state, effect, batch } from 'src/index.js';

describe('batch', () => {
  it('throws if not passed a function', () => {
    expect(() => batch('not a function')).toThrow('batch() requires a function');
    expect(() => batch(null)).toThrow('batch() requires a function');
  });

  it('returns the return value of fn', () => {
    expect(batch(() => 42)).toBe(42);
    expect(batch(() => 'ok')).toBe('ok');
    expect(batch(() => {})).toBeUndefined();
  });

  it('suppresses flushes during fn and flushes synchronously at the end', () => {
    const store = state({ count: 0 });
    let effectRuns = 0;

    effect(() => {
      void store.count;
      effectRuns++;
    });
    expect(effectRuns).toBe(1); // initial run

    batch(() => {
      store.count++;
      expect(effectRuns).toBe(1); // not yet — suppressed inside the batch
      store.count++;
      expect(effectRuns).toBe(1);
    });

    // Flushed synchronously when batch() returned — no await needed
    expect(effectRuns).toBe(2);
    expect(store.count).toBe(2);
  });

  it('runs a multi-store effect exactly once per batch', () => {
    const a = state({ value: 1 });
    const b = state({ value: 2 });
    const c = state({ value: 3 });
    const seen = [];

    effect(() => {
      seen.push(a.value + b.value + c.value);
    });
    expect(seen).toEqual([6]); // initial

    batch(() => {
      a.value = 10;
      b.value = 20;
      c.value = 30;
    });

    // Without batch(), per-state flushing would run the effect once per
    // mutated store. Inside a batch it must run exactly once, seeing the
    // final values of all three stores.
    expect(seen).toEqual([6, 60]);
  });

  it('coalesces intermediate writes — subscribers see only the final value', () => {
    const store = state({ x: 0 });
    const values = [];
    store.$subscribe('x', v => values.push(v));
    expect(values).toEqual([0]); // immediate call on subscribe

    batch(() => {
      store.x = 1;
      store.x = 2;
      store.x = 3;
    });

    expect(values).toEqual([0, 3]);
  });

  it('absorbs nested batches into the outermost one', () => {
    const store = state({ count: 0 });
    let effectRuns = 0;

    effect(() => {
      void store.count;
      effectRuns++;
    });
    expectInitial(effectRuns);

    const result = batch(() => {
      store.count++;
      const inner = batch(() => {
        store.count++;
        return 'inner';
      });
      expect(inner).toBe('inner');
      expect(effectRuns).toBe(1); // inner batch must NOT flush
      return 'outer';
    });

    expect(result).toBe('outer');
    expect(effectRuns).toBe(2);
    expect(store.count).toBe(2);

    function expectInitial(runs) {
      expect(runs).toBe(1);
    }
  });

  it('flushes writes made before a throw, then propagates the error', async () => {
    const store = state({ count: 0 });
    let effectRuns = 0;

    effect(() => {
      void store.count;
      effectRuns++;
    });

    expect(() => {
      batch(() => {
        store.count = 5;
        throw new Error('boom');
      });
    }).toThrow('boom');

    // The write before the throw was committed and flushed
    expect(store.count).toBe(5);
    expect(effectRuns).toBe(2);

    // Scheduling is clean afterwards: normal microtask flushing works
    store.count = 6;
    expect(effectRuns).toBe(2); // back to async batching
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(effectRuns).toBe(3);
  });

  it('captures cascading writes from effects inside the batch flush', () => {
    const source = state({ value: 0 });
    const derived = state({ doubled: 0 });
    const log = [];

    effect(() => {
      derived.doubled = source.value * 2;
    });
    effect(() => {
      log.push(derived.doubled);
    });
    expect(log).toEqual([0]);

    batch(() => {
      source.value = 21;
    });

    // The first effect ran in the batch flush and wrote derived.doubled;
    // that cascading write was collected into the same synchronous flush.
    expect(derived.doubled).toBe(42);
    expect(log).toEqual([0, 42]);
  });

  it('stops runaway cascades at the iteration cap with an error', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const store = state({ n: 0 });

    // Self-perpetuating effect: every run writes the key it depends on
    const cleanup = effect(() => {
      store.n = store.n + 1;
    });

    batch(() => {
      store.n = 1000;
    });

    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('Maximum batch flush iterations reached')
    );

    cleanup();
    errorSpy.mockRestore();
  });

  it('flushes pre-batch pending writes of a store the batch also touches', () => {
    const store = state({ a: 0, b: 0 });
    const seenA = [];
    const seenB = [];
    store.$subscribe('a', v => seenA.push(v));
    store.$subscribe('b', v => seenB.push(v));

    store.a = 1; // pending microtask flush
    batch(() => {
      store.b = 2; // same store joins the batch
    });

    // Both keys flushed synchronously by the batch (the pending microtask
    // later finds nothing to do)
    expect(seenA).toEqual([0, 1]);
    expect(seenB).toEqual([0, 2]);
  });

  it('does not flush stores untouched by the batch', async () => {
    const inside = state({ x: 0 });
    const outside = state({ y: 0 });
    const seenY = [];
    outside.$subscribe('y', v => seenY.push(v));

    outside.y = 1; // pending microtask, unrelated to the batch
    batch(() => {
      inside.x = 1;
    });

    // outside still flushes on its own microtask, not synchronously
    expect(seenY).toEqual([0]);
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(seenY).toEqual([0, 1]);
  });

  it('runs $beforeFlush hooks during the batch flush', () => {
    const store = state({ x: 0 });
    const order = [];
    store.$beforeFlush(() => order.push('hook'));
    store.$subscribe('x', v => { if (v !== 0) order.push(`sub:${v}`); });

    batch(() => {
      store.x = 1;
    });

    expect(order).toEqual(['hook', 'sub:1']);
  });

  it('a batch with no writes flushes nothing and still returns', () => {
    const store = state({ x: 0 });
    const spy = vi.fn();
    store.$subscribe('x', spy);
    spy.mockClear();

    expect(batch(() => 'noop')).toBe('noop');
    expect(spy).not.toHaveBeenCalled();
  });

  it('warns when given an async function (writes after await escape the batch)', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const store = state({ x: 0 });

    const result = batch(async () => {
      store.x = 1; // before first await — batched
      await Promise.resolve();
      store.x = 2; // after await — falls back to microtask flushing
      return 'async-done';
    });

    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('batch() received an async function')
    );
    await expect(result).resolves.toBe('async-done');
    expect(store.x).toBe(2);
    warnSpy.mockRestore();
  });

  it('contains effect errors during the batch flush and keeps flushing', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const store = state({ x: 0 });
    let healthyRuns = 0;

    effect(() => {
      if (store.x > 0) throw new Error('effect boom');
    });
    effect(() => {
      void store.x;
      healthyRuns++;
    });
    expect(healthyRuns).toBe(1);

    // Must not throw out of batch(); the healthy effect still runs
    expect(() => batch(() => { store.x = 1; })).not.toThrow();

    expect(healthyRuns).toBe(2);
    expect(errorSpy).toHaveBeenCalledWith(
      '[Lume.js state] Error in effect:',
      expect.any(Error)
    );
    errorSpy.mockRestore();
  });

  it('effects queued by a batch and by a later microtask both run once', async () => {
    const store = state({ x: 0 });
    let effectRuns = 0;
    effect(() => {
      void store.x;
      effectRuns++;
    });
    expect(effectRuns).toBe(1);

    batch(() => { store.x = 1; });
    expect(effectRuns).toBe(2);

    store.x = 2;
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(effectRuns).toBe(3);
  });
});
