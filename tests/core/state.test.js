import { describe, it, expect, vi } from 'vitest';
import { state } from 'src/core/state.js';

describe('state', () => {
  it('throws for non-object inputs', () => {
    expect(() => state(null)).toThrow('state() requires a plain object');
    expect(() => state(1)).toThrow('state() requires a plain object');
    expect(() => state([])).toThrow('state() requires a plain object');
  });

  it('gets and sets properties', () => {
    const store = state({ count: 0 });
    expect(store.count).toBe(0);
    store.count = 2;
    expect(store.count).toBe(2);
  });

  it('notifies subscribers only on change', () => {
    const store = state({ count: 0 });
    const spy = vi.fn();
    store.$subscribe('count', spy);
    // immediate call with current value
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenLastCalledWith(0);

    // change value triggers notify
    store.count = 1;
    expect(spy).toHaveBeenCalledTimes(2);
    expect(spy).toHaveBeenLastCalledWith(1);

    // setting same value should not notify again
    store.count = 1;
    expect(spy).toHaveBeenCalledTimes(2);
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

  it('separate keys have isolated subscriptions', () => {
    const store = state({ a: 1, b: 2 });
    const spyA = vi.fn();
    const spyB = vi.fn();
    store.$subscribe('a', spyA);
    store.$subscribe('b', spyB);
    spyA.mockClear();
    spyB.mockClear();

    store.a = 10;
    expect(spyA).toHaveBeenCalledWith(10);
    expect(spyB).not.toHaveBeenCalled();

    spyA.mockClear();
    store.b = 20;
    expect(spyB).toHaveBeenCalledWith(20);
    expect(spyA).not.toHaveBeenCalled();
  });

  it('validates subscriber callback', () => {
    const store = state({ x: 1 });
    // @ts-ignore
    expect(() => store.$subscribe('x', 123)).toThrow('Subscriber must be a function');
  });
});
