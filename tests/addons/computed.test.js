import { describe, it, expect, vi } from 'vitest';
import { state } from 'src/core/state.js';
import { computed } from 'src/addons/computed.js';

describe('computed', () => {
  it('computes a derived value automatically', async () => {
    const store = state({ count: 2 });
    const double = computed(() => store.count * 2);
    expect(double.value).toBe(4);

    store.count = 3;
    // Wait for automatic recomputation via effect batching
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(double.value).toBe(6);
  });

  it('notifies subscribers when value changes automatically', async () => {
    const store = state({ n: 5 });
    const squared = computed(() => store.n * store.n);
    const spy = vi.fn();
    const unsub = squared.subscribe(spy);

    // Initial subscription call
    expect(spy).toHaveBeenCalledWith(25);

    spy.mockClear();
    store.n = 6;
    
    // Wait for automatic recomputation
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(spy).toHaveBeenCalledWith(36);

    unsub();
    spy.mockClear();
    store.n = 7;
    
    // Wait and verify unsubscribed callback wasn't called
    await new Promise(resolve => setTimeout(resolve, 0));
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
  });

  it('tracks only accessed dependencies dynamically', async () => {
    const store = state({ a: 1, b: 2, flag: false });
    const calc = vi.fn(() => {
      if (store.flag) {
        return store.a + store.b;
      }
      return store.a;
    });
    const c = computed(calc);
    
    expect(c.value).toBe(1); // Only uses store.a
    expect(calc).toHaveBeenCalledTimes(1);
    
    // Change b - should not trigger recompute since flag is false
    calc.mockClear();
    store.b = 10;
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(calc).not.toHaveBeenCalled();
    expect(c.value).toBe(1);
    
    // Set flag to true - should trigger recompute and now track both a and b
    store.flag = true;
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(calc).toHaveBeenCalledTimes(1);
    expect(c.value).toBe(11); // 1 + 10
    
    // Now changing b should trigger recompute
    calc.mockClear();
    store.b = 20;
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(calc).toHaveBeenCalledTimes(1);
    expect(c.value).toBe(21); // 1 + 20
  });

  it('handles errors inside compute function', () => {
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    const bad = computed(() => {
      throw new Error('boom');
    });
    
    // Should not throw, returns undefined on error
    expect(bad.value).toBeUndefined();
    expect(errSpy).toHaveBeenCalledWith('[Lume.js computed] Error in computation:', expect.any(Error));
    
    errSpy.mockRestore();
  });
  
  it('handles error state changes and notifies subscribers', async () => {
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const store = state({ shouldError: false, value: 5 });
    
    const c = computed(() => {
      if (store.shouldError) {
        throw new Error('computation error');
      }
      return store.value * 2;
    });
    
    const spy = vi.fn();
    c.subscribe(spy);
    
    expect(c.value).toBe(10);
    expect(spy).toHaveBeenCalledWith(10);
    
    // Trigger error state
    spy.mockClear();
    store.shouldError = true;
    await new Promise(resolve => setTimeout(resolve, 0));
    
    expect(c.value).toBeUndefined();
    expect(spy).toHaveBeenCalledWith(undefined);
    expect(errSpy).toHaveBeenCalled();
    
    errSpy.mockRestore();
  });
  
  it('validates subscribe callback parameter', () => {
    const store = state({ count: 1 });
    const c = computed(() => store.count);
    
    expect(() => c.subscribe(null)).toThrow('subscribe() requires a function');
    expect(() => c.subscribe(123)).toThrow('subscribe() requires a function');
    expect(() => c.subscribe('string')).toThrow('subscribe() requires a function');
  });
  
  it('properly cleans up when disposed', async () => {
    const store = state({ count: 1 });
    const calc = vi.fn(() => store.count * 2);
    const c = computed(calc);
    
    expect(c.value).toBe(2);
    expect(calc).toHaveBeenCalledTimes(1);
    
    // Dispose the computed
    c.dispose();
    
    // Changes should not trigger recomputation after disposal
    calc.mockClear();
    store.count = 5;
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(calc).not.toHaveBeenCalled();
  });

  it('handles transition from successful computation to error state with subscribers', async () => {
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const store = state({ shouldError: false });
    const spy = vi.fn();
    
    const c = computed(() => {
      if (store.shouldError) {
        throw new Error('computation failed');
      }
      return 'success';
    });
    
    // Subscribe to a successfully computed value
    c.subscribe(spy);
    expect(c.value).toBe('success');
    expect(spy).toHaveBeenCalledWith('success');
    
    // Clear spy and trigger error state
    spy.mockClear();
    store.shouldError = true;
    await new Promise(resolve => setTimeout(resolve, 0));
    
    // Should notify subscribers of error state (undefined)
    expect(spy).toHaveBeenCalledWith(undefined);
    expect(c.value).toBeUndefined();
    
    errSpy.mockRestore();
  });

  it('handles invalid function parameter', () => {
    expect(() => computed(null)).toThrow('computed() requires a function');
    expect(() => computed(123)).toThrow('computed() requires a function');
    expect(() => computed('string')).toThrow('computed() requires a function');
  });

  it('ensures value is always accessible after creation', () => {
    // Test that the effect runs synchronously during creation
    const store = state({ count: 1 });
    const c = computed(() => store.count * 2);
    
    // Value should be immediately available after creation
    expect(c.value).toBe(2);
    
    // This test ensures our initialization logic is sound
    // If effect becomes async in the future, this test will catch it
  });

  it('throws error when accessing value before initialization completes', () => {
    // Create a computed that we can manipulate for testing
    const store = state({ count: 5 });
    const c = computed(() => store.count * 2);
    
    // Verify it works normally first
    expect(c.value).toBe(10);
    
    // Now simulate uninitialized state by calling dispose and accessing internal state
    // This is a bit of a hack but allows us to test the edge case
    c.dispose();
    
    // After dispose, isInitialized is set to false
    // So accessing value should throw the initialization error
    expect(() => c.value).toThrow('Computed value accessed before initialization');
  });
});
