import { describe, it, expect, vi } from 'vitest';
import * as addons from 'src/addons/index.js';
import { state, effect } from 'src/index.js';

describe('addons public API', () => {
  it('exposes computed and watch', () => {
    expect(addons).toHaveProperty('computed');
    expect(typeof addons.computed).toBe('function');
    expect(addons).toHaveProperty('watch');
    expect(typeof addons.watch).toBe('function');
  });

  it('exposes repeat and preservation utilities', () => {
    expect(addons).toHaveProperty('repeat');
    expect(typeof addons.repeat).toBe('function');
    expect(addons).toHaveProperty('defaultFocusPreservation');
    expect(typeof addons.defaultFocusPreservation).toBe('function');
    expect(addons).toHaveProperty('defaultScrollPreservation');
    expect(typeof addons.defaultScrollPreservation).toBe('function');
  });

  it('exposes debug utilities', () => {
    expect(addons).toHaveProperty('createDebugPlugin');
    expect(typeof addons.createDebugPlugin).toBe('function');
    expect(addons).toHaveProperty('debug');
    expect(typeof addons.debug).toBe('object');
  });

  it('exposes isReactive', () => {
    expect(addons).toHaveProperty('isReactive');
    expect(typeof addons.isReactive).toBe('function');
  });

  it('exposes withPlugins', () => {
    expect(addons).toHaveProperty('withPlugins');
    expect(typeof addons.withPlugins).toBe('function');
  });

  it('exposes createCleanupGroup', () => {
    expect(addons).toHaveProperty('createCleanupGroup');
    expect(typeof addons.createCleanupGroup).toBe('function');
  });

  it('exposes hydrateState', () => {
    expect(addons).toHaveProperty('hydrateState');
    expect(typeof addons.hydrateState).toBe('function');
  });
});

describe('isReactive', () => {
  it('detects stores via the shared brand', () => {
    const store = state({ count: 0 });
    expect(addons.isReactive(store)).toBe(true);
  });

  it('rejects non-reactive values', () => {
    expect(addons.isReactive({})).toBe(false);
    expect(addons.isReactive(null)).toBe(false);
    expect(addons.isReactive(undefined)).toBe(false);
    expect(addons.isReactive(42)).toBe(false);
    expect(addons.isReactive('store')).toBe(false);
  });

  it('falls back to duck-typing for unbranded store-likes (older versions)', () => {
    const storeLike = { $subscribe: () => () => {} };
    expect(addons.isReactive(storeLike)).toBe(true);
  });

  it('does not create a dependency when called inside an effect', async () => {
    const store = state({ count: 0 });
    const fn = vi.fn();

    effect(() => {
      fn();
      addons.isReactive(store); // brand check must not track anything
    });

    expect(fn).toHaveBeenCalledTimes(1);

    store.count = 1; // not read by the effect → must not re-run
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(fn).toHaveBeenCalledTimes(1);
  });
});
