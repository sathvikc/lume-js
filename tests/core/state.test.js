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
});
