import { describe, it, expect, vi } from 'vitest';
import { state } from '../../src/core/state.js';
import { computed } from '../../src/addons/computed.js';

describe('computed', () => {
  it('computes a derived value lazily', () => {
    const store = state({ count: 2 });
    const double = computed(() => store.count * 2);
    expect(double.value).toBe(4);

    store.count = 3;
    // recompute is manual per docs
    double.recompute();
    expect(double.value).toBe(6);
  });

  it('notifies subscribers on recompute', () => {
    const store = state({ n: 5 });
    const squared = computed(() => store.n * store.n);
    const spy = vi.fn();
    const unsub = squared.subscribe(spy);

    expect(spy).toHaveBeenCalled();
    expect(spy).toHaveBeenLastCalledWith(25);

    spy.mockClear();
    store.n = 6;
    squared.recompute();
    expect(spy).toHaveBeenCalledWith(36);

    unsub();
    spy.mockClear();
    store.n = 7;
    squared.recompute();
    expect(spy).not.toHaveBeenCalled();
  });

  it('subscribes without recomputing when already computed', () => {
    const store = state({ x: 2 });
    const calc = vi.fn(() => store.x + 1);
    const c = computed(calc);

    // First access computes value
    expect(c.value).toBe(3);
    expect(calc).toHaveBeenCalledTimes(1);

    // Subscribe after value is computed should not recompute
    const spy = vi.fn();
    c.subscribe(spy);
    expect(spy).toHaveBeenCalledWith(3);
    expect(calc).toHaveBeenCalledTimes(1);

    // Recompute explicitly changes value and notifies
    store.x = 5;
    c.recompute();
    expect(c.value).toBe(6);
    expect(spy).toHaveBeenLastCalledWith(6);
  });

  it('handles errors inside compute function', () => {
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const bad = computed(() => {
        throw new Error('boom');
      });
      // accessing value after error should not throw, returns undefined
      expect(bad.value).toBeUndefined();
    } finally {
      errSpy.mockRestore();
    }
  });
});
