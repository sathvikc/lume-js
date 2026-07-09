import { describe, it, expect, vi } from 'vitest';
import { state } from 'src/core/state.js';
import { effect } from 'src/core/effect.js';
import { isReactive } from 'src/addons/index.js';
import * as log from 'src/utils/log.js';

describe('state', () => {
  it('throws for non-object inputs', () => {
    expect(() => state(null)).toThrow('state() requires a plain object');
    expect(() => state(1)).toThrow('state() requires a plain object');
    expect(() => state([])).toThrow('state() requires a plain object');
  });

  it('throws for frozen or sealed objects', () => {
    expect(() => state(Object.freeze({ x: 1 }))).toThrow('state() requires a mutable plain object');
    expect(() => state(Object.seal({ x: 1 }))).toThrow('state() requires a mutable plain object');
  });

  it('gets and sets properties', () => {
    const store = state({ count: 0 });
    expect(store.count).toBe(0);
    store.count = 2;
    expect(store.count).toBe(2);
  });

  it('notifies subscribers only on change', async () => {
    const store = state({ count: 0 });
    const spy = vi.fn();
    store.$subscribe('count', spy);
    // immediate call with current value
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenLastCalledWith(0);

    spy.mockClear();
    // change value triggers notify (batched)
    store.count = 1;
    await Promise.resolve(); // Wait for microtask
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenLastCalledWith(1);

    spy.mockClear();
    // setting same value should not notify again
    store.count = 1;
    await Promise.resolve(); // Wait for microtask
    expect(spy).not.toHaveBeenCalled();
  });

  it('uses Object.is() to correctly handle NaN and -0', async () => {
    const store = state({ value: NaN, zero: 0 });
    const spy = vi.fn();
    store.$subscribe('value', spy);
    spy.mockClear();

    // NaN === NaN is false, but Object.is(NaN, NaN) is true
    // Setting NaN again should NOT trigger notification
    store.value = NaN;
    await Promise.resolve();
    expect(spy).not.toHaveBeenCalled();

    // Setting a different value should trigger notification
    store.value = 5;
    await Promise.resolve();
    expect(spy).toHaveBeenCalledWith(5);
  });

  it('supports unsubscribe', () => {
    const store = state({ name: 'a' });
    const spy = vi.fn();
    const unsub = store.$subscribe('name', spy);
    expect(spy).toHaveBeenCalledWith('a');
    spy.mockClear();

    unsub();
    store.name = 'b';
    expect(spy).not.toHaveBeenCalled();
  });

  it('separate keys have isolated subscriptions', async () => {
    const store = state({ a: 1, b: 2 });
    const spyA = vi.fn();
    const spyB = vi.fn();
    store.$subscribe('a', spyA);
    store.$subscribe('b', spyB);
    spyA.mockClear();
    spyB.mockClear();

    store.a = 10;
    await Promise.resolve(); // Wait for microtask
    expect(spyA).toHaveBeenCalledWith(10);
    expect(spyB).not.toHaveBeenCalled();

    spyA.mockClear();
    store.b = 20;
    await Promise.resolve(); // Wait for microtask
    expect(spyB).toHaveBeenCalledWith(20);
    expect(spyA).not.toHaveBeenCalled();
  });

  it('validates subscriber callback', () => {
    const store = state({ x: 1 });
    // @ts-ignore
    expect(() => store.$subscribe('x', 123)).toThrow('Subscriber must be a function');
  });

  it('batches multiple synchronous changes via microtasks', async () => {
    const store = state({ count: 0 });
    const spy = vi.fn();
    store.$subscribe('count', spy);
    spy.mockClear(); // Clear the initial call

    // Make multiple synchronous changes
    store.count = 1;
    store.count = 2;
    store.count = 3;

    // Should not have called the subscriber yet (batched)
    expect(spy).not.toHaveBeenCalled();

    // Wait for microtask to flush
    await Promise.resolve();

    // Should only be called once with the final value
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith(3);
  });

  it('batches changes for multiple subscribers of same key', async () => {
    const store = state({ value: 'initial' });
    const spy1 = vi.fn();
    const spy2 = vi.fn();

    store.$subscribe('value', spy1);
    store.$subscribe('value', spy2);
    spy1.mockClear();
    spy2.mockClear();

    // Multiple changes
    store.value = 'a';
    store.value = 'b';
    store.value = 'final';

    // Nothing called yet (batched)
    expect(spy1).not.toHaveBeenCalled();
    expect(spy2).not.toHaveBeenCalled();

    // Wait for microtask
    await Promise.resolve();

    // Both should be called once with final value
    expect(spy1).toHaveBeenCalledTimes(1);
    expect(spy1).toHaveBeenCalledWith('final');
    expect(spy2).toHaveBeenCalledTimes(1);
    expect(spy2).toHaveBeenCalledWith('final');
  });

  it('handles multiple keys independently in batching', async () => {
    const store = state({ a: 1, b: 'x' });
    const spyA = vi.fn();
    const spyB = vi.fn();

    store.$subscribe('a', spyA);
    store.$subscribe('b', spyB);
    spyA.mockClear();
    spyB.mockClear();

    // Change both keys multiple times
    store.a = 10;
    store.b = 'y';
    store.a = 20;
    store.b = 'z';

    // Nothing called yet
    expect(spyA).not.toHaveBeenCalled();
    expect(spyB).not.toHaveBeenCalled();

    // Wait for microtask
    await Promise.resolve();

    // Each should be called once with final values
    expect(spyA).toHaveBeenCalledTimes(1);
    expect(spyA).toHaveBeenCalledWith(20);
    expect(spyB).toHaveBeenCalledTimes(1);
    expect(spyB).toHaveBeenCalledWith('z');
  });

  it('unsubscribe removes only one instance when same callback is subscribed twice', async () => {
    const store = state({ name: 'a' });
    const spy = vi.fn();
    const unsub1 = store.$subscribe('name', spy);
    const unsub2 = store.$subscribe('name', spy);
    expect(spy).toHaveBeenCalledTimes(2); // immediate calls
    spy.mockClear();

    unsub1(); // should only remove the first subscription
    store.name = 'b';
    await Promise.resolve();
    expect(spy).toHaveBeenCalledTimes(1); // second subscription still active

    spy.mockClear();
    unsub2(); // remove the second
    store.name = 'c';
    await Promise.resolve();
    expect(spy).not.toHaveBeenCalled();
  });

  it('invokes all subscribers scheduled at flush even if one unsubscribes another during notification', async () => {
    const store = state({ val: 0 });

    let firstCalls = 0;
    let secondCalls = 0;
    let unsubSecond;

    // Second subscriber (will potentially be removed by first during first flush)
    unsubSecond = store.$subscribe('val', () => {
      secondCalls++;
    });

    // First subscriber unsubscribes second ONLY during the flush (value === 1)
    store.$subscribe('val', (v) => {
      firstCalls++;
      if (v === 1) {
        unsubSecond(); // unsubscribe second inside notification callback
      }
    });

    // Clear initial immediate call counts (both subscribers saw initial value 0 already)
    expect(firstCalls).toBe(1); // immediate
    expect(secondCalls).toBe(1); // immediate

    // Trigger first flush with value 1 – both should be called; second then unsubscribed
    store.val = 1;
    await Promise.resolve();
    expect(firstCalls).toBe(2); // immediate + flush
    expect(secondCalls).toBe(2); // still called this flush even though unsubscribed inside first callback

    // Trigger second flush with value 2 – only first should run now
    store.val = 2;
    await Promise.resolve();
    expect(firstCalls).toBe(3);
    expect(secondCalls).toBe(2); // not incremented

    // This behavior relies on snapshot iteration; without Array.from() capturing listeners
    // at flush start, mutating the listeners list inside a callback could cause skipped execution.
  });

  it('detects reactive proxy with isReactive', () => {
    const original = { count: 1 };
    const store = state(original);
    expect(isReactive(store)).toBe(true);
    // Duck-typing: state() stamps $subscribe onto the raw obj, so original also passes.
    // This is an accepted tradeoff of moving from marker-based to duck-typing detection.
    expect(isReactive(original)).toBe(true);
  });

  it('isReactive returns false for primitives and null', () => {
    expect(isReactive(null)).toBe(false);
    expect(isReactive(123)).toBe(false);
    expect(isReactive('str')).toBe(false);
    expect(isReactive(true)).toBe(false);
  });

  it('nested state objects are also detected', () => {
    const inner = state({ a: 1 });
    const outer = state({ inner });
    expect(isReactive(outer)).toBe(true);
    expect(isReactive(inner)).toBe(true);
    expect(isReactive(outer.inner)).toBe(true);
  });

  it('blocks writes to prototype-polluting keys', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const store = state({ count: 0 });

    store.__proto__ = { injected: true };
    store.constructor = function Mal() {};
    store.prototype = { hacked: true };

    expect(store.count).toBe(0);
    expect(Object.getPrototypeOf(store)).toBe(Object.prototype);

    expect(warnSpy).toHaveBeenCalledTimes(3);
    warnSpy.mockRestore();
  });

  it('enforces a maximum number of subscribers per key with a loud error', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const store = state({ x: 0 });

    const unsubs = [];
    for (let i = 0; i < 1002; i++) {
      unsubs.push(store.$subscribe('x', () => {}));
    }

    expect(errorSpy).toHaveBeenCalledTimes(2);
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('Subscriber limit (1000) reached for key "x"')
    );
    errorSpy.mockRestore();

    // Cleanup — including the no-op unsubscribes from capped calls
    unsubs.forEach(u => u());
  });

  it('applies the same subscriber cap to effect subscriptions', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const store = state({ x: 0 });

    // Fill the key to the cap with plain subscribers…
    const unsubs = [];
    for (let i = 0; i < 1000; i++) {
      unsubs.push(store.$subscribe('x', () => {}));
    }
    expect(errorSpy).not.toHaveBeenCalled();

    // …then an effect tracking the same key must hit the same cap
    // (previously effects bypassed it entirely — inconsistent).
    let runs = 0;
    const cleanup = effect(() => {
      void store.x;
      runs++;
    });

    expect(runs).toBe(1); // initial run still happens
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('Effect subscription ignored')
    );

    // The capped effect must not re-run (its subscription was rejected)
    store.x = 1;
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(runs).toBe(1);

    cleanup(); // covers the no-op unsubscribe path for effects
    unsubs.forEach(u => u());
    errorSpy.mockRestore();
  });

  it('delivers a subscriber write-back to an already-notified key', async () => {
    const store = state({ a: 0, b: 0 });
    const seenA = [];
    store.$subscribe('a', v => seenA.push(v));
    // b's subscriber writes BACK to a, which was already delivered this pass
    store.$subscribe('b', v => { if (v === 2) store.a = 99; });

    store.a = 1;
    store.b = 2;
    await new Promise(resolve => setTimeout(resolve, 0));

    expect(store.a).toBe(99);
    // Before the drain-first fix the write-back updated the in-flight Map
    // entry and clear() destroyed it — 99 was never delivered.
    expect(seenA).toEqual([0, 1, 99]);
  });

  it('self-clamping subscriber converges and delivers the clamped value', async () => {
    const store = state({ x: 0 });
    const seen = [];
    store.$subscribe('x', v => {
      seen.push(v);
      if (v > 10) store.x = 10;
    });

    store.x = 50;
    await new Promise(resolve => setTimeout(resolve, 0));

    expect(store.x).toBe(10);
    expect(seen).toEqual([0, 50, 10]);
  });

  it('reactive brand symbol is present but not enumerable', () => {
    const store = state({ x: 1 });
    const brands = Object.getOwnPropertySymbols(store);
    expect(brands.some(s => String(s) === 'Symbol(lume.reactive)')).toBe(true);
    expect(Object.keys(store)).not.toContain('Symbol(lume.reactive)');
  });

  it('all stores share one registry brand symbol', () => {
    const brand = Symbol.for('lume.reactive');
    const storeA = state({ a: 1 });
    const storeB = state({ b: 2 });

    // Same shared symbol on every store — readable by anyone via Symbol.for
    expect(brand in storeA).toBe(true);
    expect(brand in storeB).toBe(true);

    // Non-enumerable: a spread copy of a store does not inherit the brand
    expect(brand in { ...storeA }).toBe(false);
  });

  it('re-wrapping the same object does not throw on the brand stamp', () => {
    const obj = { x: 1 };
    state(obj);
    // Second wrap re-defines the brand with identical attributes — allowed
    expect(() => state(obj)).not.toThrow();
  });
});

describe('state edge cases', () => {
  it('Symbol keys work and bypass $-prefix guard', () => {
    const sym = Symbol('test');
    const store = state({ [sym]: 42 });
    expect(store[sym]).toBe(42);
    expect(Object.keys(store)).not.toContain(String(sym));
  });

  it('Object.is treats +0 and -0 as different values', async () => {
    const store = state({ value: 0 });
    const spy = vi.fn();
    store.$subscribe('value', spy);
    spy.mockClear();

    store.value = -0;
    await Promise.resolve();
    expect(spy).toHaveBeenCalledWith(-0);
  });

  it('$beforeFlush runs before subscribers in a flush', async () => {
    const store = state({ count: 0 });
    const order = [];
    store.$beforeFlush(() => order.push('beforeFlush'));
    store.$subscribe('count', () => order.push('subscriber'));
    order.length = 0;

    store.count = 1;
    await Promise.resolve();
    expect(order).toEqual(['beforeFlush', 'subscriber']);
  });

  it('$beforeFlush returns an unsubscribe function', async () => {
    const store = state({ count: 0 });
    const spy = vi.fn();
    const unsub = store.$beforeFlush(spy);

    store.count = 1;
    await Promise.resolve();
    expect(spy).toHaveBeenCalledTimes(1);

    spy.mockClear();
    unsub();
    store.count = 2;
    await Promise.resolve();
    expect(spy).not.toHaveBeenCalled();
  });

  it('$beforeFlush throws for non-function input', () => {
    const store = state({ count: 0 });
    expect(() => store.$beforeFlush(123)).toThrow('$beforeFlush requires a function');
  });

  it('$beforeFlush deduplicates the same function reference', async () => {
    const store = state({ count: 0 });
    const spy = vi.fn();

    store.$beforeFlush(spy);
    store.$beforeFlush(spy);

    store.count = 1;
    await Promise.resolve();

    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('isolates subscriber errors so remaining subscribers still receive updates', async () => {
    const logErrorSpy = vi.spyOn(log, 'logError').mockImplementation(() => {});
    const store = state({ count: 0 });
    const goodSpy = vi.fn();
    const badSpy = vi.fn((val) => { if (val !== 0) throw new Error('bad subscriber'); });

    store.$subscribe('count', badSpy);
    store.$subscribe('count', goodSpy);

    badSpy.mockClear();
    goodSpy.mockClear();

    store.count = 1;
    await Promise.resolve();

    expect(badSpy).toHaveBeenCalledWith(1);
    expect(goodSpy).toHaveBeenCalledWith(1);
    logErrorSpy.mockRestore();
  });

  it('continues scheduling flushes after a subscriber error', async () => {
    const logErrorSpy = vi.spyOn(log, 'logError').mockImplementation(() => {});
    const store = state({ count: 0 });
    const spy = vi.fn();

    store.$subscribe('count', (val) => { if (val !== 0) throw new Error('bad'); });
    store.$subscribe('count', spy);

    spy.mockClear();

    store.count = 1;
    await Promise.resolve();
    expect(spy).toHaveBeenCalledWith(1);
    spy.mockClear();

    store.count = 2;
    await Promise.resolve();
    expect(spy).toHaveBeenCalledWith(2);
    logErrorSpy.mockRestore();
  });

  it('isolates beforeFlush hook errors so subscribers still run', async () => {
    const logErrorSpy = vi.spyOn(log, 'logError').mockImplementation(() => {});
    const store = state({ count: 0 });
    const spy = vi.fn();

    store.$beforeFlush(() => { throw new Error('hook bad'); });
    store.$subscribe('count', spy);

    spy.mockClear();

    store.count = 1;
    await Promise.resolve();
    expect(spy).toHaveBeenCalledWith(1);
    logErrorSpy.mockRestore();
  });

  it('logs error via state flush when an effect throws', async () => {
    const logErrorSpy = vi.spyOn(log, 'logError').mockImplementation(() => {});
    const store = state({ count: 0 });

    let runs = 0;
    const cleanup = effect(() => {
      void store.count;
      runs++;
      if (runs > 1) throw new Error('effect exploded');
    });

    store.count = 1;
    await Promise.resolve();

    const stateErrCalls = logErrorSpy.mock.calls.filter(
      ([msg]) => typeof msg === 'string' && msg.includes('[Lume.js state] Error in effect:')
    );
    expect(stateErrCalls.length).toBeGreaterThan(0);

    cleanup();
    logErrorSpy.mockRestore();
  });

  it('stops flush at MAX_ITERATIONS and logs error', async () => {
    const logErrorSpy = vi.spyOn(log, 'logError').mockImplementation(() => {});
    const store = state({ n: 0 });

    // Auto-tracking effect that writes to the state it reads → re-queued via
    // pendingEffects on every iteration, never stopping until MAX_ITERATIONS
    const cleanup = effect(() => {
      const val = store.n;
      if (val < 200) store.n = val + 1;
    });

    await Promise.resolve();

    const maxIterCalls = logErrorSpy.mock.calls.filter(
      ([msg]) => typeof msg === 'string' && msg.includes('Maximum flush iterations reached')
    );
    expect(maxIterCalls.length).toBe(1);

    cleanup();
    logErrorSpy.mockRestore();
  });
});
