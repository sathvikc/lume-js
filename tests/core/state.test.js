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
});
