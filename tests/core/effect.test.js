/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi } from 'vitest';
import { state, effect } from '../../src/index.js';

describe('effect', () => {
  it('should throw error if not given a function', () => {
    expect(() => effect(null)).toThrow('effect() requires a function');
    expect(() => effect(123)).toThrow('effect() requires a function');
    expect(() => effect('string')).toThrow('effect() requires a function');
  });

  it('should run immediately on creation', () => {
    const store = state({ count: 0 });
    const fn = vi.fn();

    effect(() => {
      fn();
      store.count; // Access to trigger tracking
    });

    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('should track dependencies and re-run when they change', async () => {
    const store = state({ count: 0, name: 'Alice' });
    const fn = vi.fn();

    effect(() => {
      fn();
      const _ = store.count; // Only access count
    });

    expect(fn).toHaveBeenCalledTimes(1);

    // Change tracked property
    store.count = 1;

    // Wait for microtask batching
    await new Promise(resolve => setTimeout(resolve, 0));

    expect(fn).toHaveBeenCalledTimes(2);

    // Change untracked property
    store.name = 'Bob';

    // Wait for microtask batching
    await new Promise(resolve => setTimeout(resolve, 0));

    // Should still be 2 calls
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('should re-collect dependencies on each run', async () => {
    const store = state({ count: 0, flag: false, name: 'Alice' });
    const fn = vi.fn();

    effect(() => {
      fn();
      const _ = store.count; // Always accessed
      if (store.flag) {
        const _ = store.name; // Only accessed when flag is true
      }
    });

    expect(fn).toHaveBeenCalledTimes(1);

    // Change name - should not trigger since flag is false
    store.name = 'Bob';
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(fn).toHaveBeenCalledTimes(1);

    // Set flag to true - should trigger
    store.flag = true;
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(fn).toHaveBeenCalledTimes(2);

    // Now name changes should trigger since flag is true
    store.name = 'Charlie';
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('should return cleanup function that stops the effect', async () => {
    const store = state({ count: 0 });
    const fn = vi.fn();

    const cleanup = effect(() => {
      fn();
      store.count; // Access to trigger tracking
    });

    expect(fn).toHaveBeenCalledTimes(1);

    store.count = 1;
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(fn).toHaveBeenCalledTimes(2);

    // Cleanup
    cleanup();

    // Should not trigger after cleanup
    store.count = 2;
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('should handle errors gracefully', () => {
    const store = state({ count: 0 });
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => { });

    expect(() => {
      effect(() => {
        store.count; // Access property
        throw new Error('Test error');
      });
    }).toThrow('Test error');

    expect(errorSpy).toHaveBeenCalledWith('[Lume.js effect] Error in effect:', expect.any(Error));
    errorSpy.mockRestore();
  });

  it('should prevent infinite recursion', async () => {
    const store = state({ count: 0 });
    const fn = vi.fn();

    effect(() => {
      fn();
      if (store.count < 5) {
        store.count++; // This would cause infinite loop without protection
      }
    });

    // Wait for all async effects
    await new Promise(resolve => setTimeout(resolve, 50));

    // Should have run multiple times but not infinitely
    expect(fn.mock.calls.length).toBeGreaterThan(1);
    expect(fn.mock.calls.length).toBeLessThan(100); // Reasonable upper bound
    expect(store.count).toBe(5);
  });

  it('should prevent re-entry during effect execution', () => {
    const store = state({ count: 0 });
    let executeCalls = 0;
    let effectRef;

    effectRef = effect(() => {
      executeCalls++;
      store.count; // Track count

      // Try to manually trigger the effect again during execution
      if (executeCalls === 1) {
        // Access the effect's execute function and try to call it
        // This simulates re-entry during execution
        const currentEffect = globalThis.__LUME_CURRENT_EFFECT__;
        if (currentEffect) {
          // This should be prevented by the isRunning guard
          currentEffect.execute();
        }
      }
    });

    // Should only run once due to re-entry prevention
    expect(executeCalls).toBe(1);
  });

  // ========================================
  // EXPLICIT DEPS MODE TESTS
  // ========================================

  describe('explicit deps mode', () => {
    it('should run immediately with explicit deps', () => {
      const store = state({ count: 0 });
      const fn = vi.fn();

      effect(() => {
        fn();
      }, [[store, 'count']]);

      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should re-run when explicit dep changes', async () => {
      const store = state({ count: 0 });
      const fn = vi.fn();

      effect(() => {
        fn(store.count);
      }, [[store, 'count']]);

      expect(fn).toHaveBeenCalledTimes(1);

      store.count = 5;
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(fn).toHaveBeenCalledTimes(2);
      expect(fn).toHaveBeenLastCalledWith(5);
    });

    it('should NOT auto-track dependencies in explicit mode', async () => {
      const store = state({ count: 0, name: 'Alice' });
      const fn = vi.fn();

      // Explicitly track only 'count', but access 'name' in the function
      effect(() => {
        fn();
        void store.name; // Access name but don't track it
      }, [[store, 'count']]);

      expect(fn).toHaveBeenCalledTimes(1);

      // Change name - should NOT trigger (not in explicit deps)
      store.name = 'Bob';
      await new Promise(resolve => setTimeout(resolve, 0));
      expect(fn).toHaveBeenCalledTimes(1);

      // Change count - SHOULD trigger (in explicit deps)
      store.count = 1;
      await new Promise(resolve => setTimeout(resolve, 0));
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it('should handle multiple explicit deps', async () => {
      const store = state({ a: 0, b: 0, c: 0 });
      const fn = vi.fn();

      effect(() => {
        fn(store.a, store.b);
      }, [[store, 'a'], [store, 'b']]);

      expect(fn).toHaveBeenCalledTimes(1);

      store.a = 1;
      await new Promise(resolve => setTimeout(resolve, 0));
      expect(fn).toHaveBeenCalledTimes(2);

      store.b = 2;
      await new Promise(resolve => setTimeout(resolve, 0));
      expect(fn).toHaveBeenCalledTimes(3);

      // c is not tracked
      store.c = 3;
      await new Promise(resolve => setTimeout(resolve, 0));
      expect(fn).toHaveBeenCalledTimes(3);
    });

    it('should cleanup explicit deps subscriptions', async () => {
      const store = state({ count: 0 });
      const fn = vi.fn();

      const cleanup = effect(() => {
        fn(store.count);
      }, [[store, 'count']]);

      expect(fn).toHaveBeenCalledTimes(1);

      store.count = 1;
      await new Promise(resolve => setTimeout(resolve, 0));
      expect(fn).toHaveBeenCalledTimes(2);

      cleanup();

      store.count = 2;
      await new Promise(resolve => setTimeout(resolve, 0));
      // Should not run after cleanup
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it('should not set globalThis.__LUME_CURRENT_EFFECT__ in explicit mode', () => {
      const store = state({ count: 0 });
      let capturedEffect = null;

      effect(() => {
        capturedEffect = globalThis.__LUME_CURRENT_EFFECT__;
      }, [[store, 'count']]);

      // In explicit mode, no global effect context should be set
      expect(capturedEffect).toBeUndefined();
    });
  });
});