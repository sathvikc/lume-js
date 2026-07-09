/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi } from 'vitest';
import { state, effect } from '../../src/index.js';
import { computed } from '../../src/addons/computed.js';

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

  it('should not re-enter synchronously when state is mutated during execution', async () => {
    const store = state({ count: 0 });
    let runs = 0;

    effect(() => {
      runs++;
      store.count; // Track count

      if (runs === 1) {
        // Mutate during execution — flush is async, so effect does not re-enter now
        store.count = 1;
      }
    });

    // Should only have run once (initial synchronous run)
    expect(runs).toBe(1);

    // After microtask flush, effect runs again — not synchronously
    await Promise.resolve();
    expect(runs).toBe(2);
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

    it('should support multi-key tuple syntax [store, key1, key2]', async () => {
      const store = state({ a: 0, b: 0, c: 0 });
      const fn = vi.fn();

      // Track 'a' and 'b' in single tuple
      effect(() => {
        fn(store.a, store.b);
      }, [[store, 'a', 'b']]);

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

    it('coalesces multiple key changes into a single run', async () => {
      const store = state({ a: 0, b: 0, c: 0 });
      const fn = vi.fn();

      effect(() => {
        fn(store.a, store.b, store.c);
      }, [[store, 'a', 'b', 'c']]);

      expect(fn).toHaveBeenCalledTimes(1);

      // Three tracked keys change in the same tick → exactly ONE re-run
      store.a = 1;
      store.b = 2;
      store.c = 3;
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(fn).toHaveBeenCalledTimes(2);
      expect(fn).toHaveBeenLastCalledWith(1, 2, 3);
    });

    it('coalesces changes across multiple stores into a single run', async () => {
      const storeA = state({ x: 0 });
      const storeB = state({ y: 0 });
      const fn = vi.fn();

      effect(() => {
        fn(storeA.x, storeB.y);
      }, [[storeA, 'x'], [storeB, 'y']]);

      expect(fn).toHaveBeenCalledTimes(1);

      storeA.x = 1;
      storeB.y = 2;
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(fn).toHaveBeenCalledTimes(2);
      expect(fn).toHaveBeenLastCalledWith(1, 2);
    });

    it('does not run a pending coalesced execution after cleanup', async () => {
      const store = state({ count: 0 });
      const fn = vi.fn();

      const cleanup = effect(() => {
        fn(store.count);
      }, [[store, 'count']]);

      expect(fn).toHaveBeenCalledTimes(1);

      // Mutate, let the store flush notify the subscriber (queuing the
      // coalesced run), THEN dispose before that microtask executes.
      store.count = 1;
      await Promise.resolve(); // store's flush microtask runs, schedules execute
      cleanup();
      await new Promise(resolve => setTimeout(resolve, 0));

      // The pending run must have been cancelled by disposal
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('logs and contains errors thrown on coalesced re-runs', async () => {
      const store = state({ count: 0 });
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => { });
      let runs = 0;

      effect(() => {
        void store.count;
        runs++;
        if (runs > 1) throw new Error('Re-run error');
      }, [[store, 'count']]);

      store.count = 1;
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(runs).toBe(2);
      expect(errorSpy).toHaveBeenCalledWith(
        '[Lume.js effect] Error in effect:',
        expect.any(Error)
      );

      // Effect must stay alive after a throwing run
      store.count = 2;
      await new Promise(resolve => setTimeout(resolve, 0));
      expect(runs).toBe(3);
      errorSpy.mockRestore();
    });

    it('should handle errors in explicit deps mode', () => {
      const store = state({ count: 0 });
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => { });

      // Throw during initial execution in explicit deps mode
      expect(() => {
        effect(() => {
          throw new Error('Explicit deps error');
        }, [[store, 'count']]);
      }).toThrow('Explicit deps error');

      expect(errorSpy).toHaveBeenCalledWith(
        '[Lume.js effect] Error in effect:',
        expect.any(Error)
      );
      errorSpy.mockRestore();
    });
  });

  describe('cross-store tracking', () => {
    it('tracks the same key name on different stores independently', async () => {
      const storeA = state({ value: 0 });
      const storeB = state({ value: 0 });
      const fn = vi.fn();

      effect(() => {
        fn(storeA.value, storeB.value);
      });

      expect(fn).toHaveBeenCalledTimes(1);

      // Mutating the SECOND store must re-run the effect. Before the fix,
      // tracking was keyed by property name only, so storeB.value was
      // considered "already tracked" after storeA.value and never subscribed.
      storeB.value = 1;
      await new Promise(resolve => setTimeout(resolve, 0));
      expect(fn).toHaveBeenCalledTimes(2);
      expect(fn).toHaveBeenLastCalledWith(0, 1);

      storeA.value = 1;
      await new Promise(resolve => setTimeout(resolve, 0));
      expect(fn).toHaveBeenCalledTimes(3);
      expect(fn).toHaveBeenLastCalledWith(1, 1);
    });

    it('tracks same-named keys across many stores', async () => {
      const stores = Array.from({ length: 5 }, () => state({ value: 0 }));
      const fn = vi.fn();

      effect(() => {
        fn(stores.reduce((sum, s) => sum + s.value, 0));
      });

      expect(fn).toHaveBeenLastCalledWith(0);

      // Every store must be individually reactive
      for (let i = 0; i < stores.length; i++) {
        stores[i].value = 10;
        await new Promise(resolve => setTimeout(resolve, 0));
      }
      expect(fn).toHaveBeenLastCalledWith(50);
    });

    it('still deduplicates repeated reads of the same store key', async () => {
      const store = state({ count: 0 });
      const fn = vi.fn();

      effect(() => {
        fn();
        void store.count;
        void store.count; // second read must not create a second subscription
      });

      store.count = 1;
      await new Promise(resolve => setTimeout(resolve, 0));
      // One re-run, not two (a duplicate subscription would queue it twice;
      // pendingEffects dedupes, but cleanup count would differ — assert runs)
      expect(fn).toHaveBeenCalledTimes(2);
    });
  });

  describe('nested effect tracking', () => {
    it('tracks properties accessed after a nested effect', async () => {
      const store = state({ a: 0, b: 0 });
      const fn = vi.fn();

      effect(() => {
        fn();
        void store.a;
        const innerCleanup = effect(() => {
          void store.b;
        });
        void store.a;
      });

      expect(fn).toHaveBeenCalledTimes(1);

      store.a = 1;
      await new Promise(resolve => setTimeout(resolve, 10));
      expect(fn.mock.calls.length).toBeGreaterThanOrEqual(2);
    });

    it('tracks properties accessed after a nested computed', async () => {
      const store = state({ count: 0, name: 'Alice' });
      const fn = vi.fn();

      effect(() => {
        fn();
        void store.count;
        const c = computed(() => store.name.toUpperCase());
        void store.count;
      });

      expect(fn).toHaveBeenCalledTimes(1);

      store.count = 1;
      await new Promise(resolve => setTimeout(resolve, 10));
      expect(fn.mock.calls.length).toBeGreaterThanOrEqual(2);
    });

    it('$subscribe inside auto-tracking effect causes double tracking', async () => {
      const store = state({ count: 0 });
      let effectRuns = 0;
      let subCalls = 0;

      const cleanup = effect(() => {
        effectRuns++;
        void store.count;
        store.$subscribe('count', () => {
          subCalls++;
        });
      });

      expect(effectRuns).toBe(1);

      store.count = 1;
      await new Promise(resolve => setTimeout(resolve, 10));

      // Documents behavior: both auto-tracking and manual subscribe fire
      expect(effectRuns).toBeGreaterThanOrEqual(2);
      expect(subCalls).toBeGreaterThanOrEqual(2);

      cleanup();
    });

    it('effect tracking context is not spoofable via globalThis', async () => {
      const store = state({ count: 0 });
      const spoofedExecute = vi.fn();

      // Spoof the global effect context before any real effect is created
      globalThis.__LUME_CURRENT_EFFECT__ = {
        tracking: {},
        cleanups: [],
        execute: spoofedExecute
      };

      // Read store.count while spoofed — the spoofed execute gets subscribed
      store.count;

      // Trigger a flush — the spoofed execute should NOT be called
      store.count = 1;
      await Promise.resolve();

      // If globalThis is used, spoofedExecute would be queued and called
      expect(spoofedExecute).not.toHaveBeenCalled();

      // Restore to avoid leaking the spoofed context
      delete globalThis.__LUME_CURRENT_EFFECT__;
    });
  });
});