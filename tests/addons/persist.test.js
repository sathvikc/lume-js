/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { state } from 'src/core/state.js';
import { persist } from 'src/addons/persist.js';

const tick = () => new Promise(resolve => setTimeout(resolve, 0));

describe('persist', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('throws for non-reactive stores and bad storage keys', () => {
    expect(() => persist({}, 'k')).toThrow('requires a reactive store');
    expect(() => persist(null, 'k')).toThrow('requires a reactive store');
    const store = state({ a: 1 });
    expect(() => persist(store, '')).toThrow('non-empty storage key');
    expect(() => persist(store, 42)).toThrow('non-empty storage key');
  });

  it('hydrates watched keys from storage through the proxy', () => {
    localStorage.setItem('app', JSON.stringify({ count: 9, name: 'Ada' }));
    const store = state({ count: 0, name: '' });
    const seen = [];
    store.$subscribe('count', v => seen.push(v));

    const stop = persist(store, 'app');

    expect(store.count).toBe(9);
    expect(store.name).toBe('Ada');
    stop();
  });

  it('only hydrates watched keys — stale storage cannot inject others', () => {
    localStorage.setItem('app', JSON.stringify({ count: 9, evil: 'payload' }));
    const store = state({ count: 0 });

    const stop = persist(store, 'app', { keys: ['count'] });

    expect(store.count).toBe(9);
    expect(store.evil).toBeUndefined();
    stop();
  });

  it('saves on change, coalescing multiple writes into one storage write', async () => {
    const store = state({ count: 0, name: '' });
    const setSpy = vi.spyOn(Storage.prototype, 'setItem');

    const stop = persist(store, 'app');
    expect(setSpy).not.toHaveBeenCalled(); // nothing changed yet

    store.count = 1;
    store.count = 2;
    store.name = 'Ada';
    await tick();

    expect(setSpy).toHaveBeenCalledTimes(1);
    expect(JSON.parse(localStorage.getItem('app'))).toEqual({ count: 2, name: 'Ada' });

    setSpy.mockRestore();
    stop();
  });

  it('skips the write when the snapshot is unchanged (hydration echo included)', async () => {
    localStorage.setItem('app', JSON.stringify({ count: 5 }));
    const store = state({ count: 0 });
    const setSpy = vi.spyOn(Storage.prototype, 'setItem');

    const stop = persist(store, 'app');
    await tick(); // hydration flush notifies the persist subscription

    // Value matches what storage already holds — no write
    expect(setSpy).not.toHaveBeenCalled();

    store.count = 5; // same value: Object.is guard, no notification at all
    await tick();
    expect(setSpy).not.toHaveBeenCalled();

    setSpy.mockRestore();
    stop();
  });

  it('persists only the keys in options.keys', async () => {
    const store = state({ todos: [], draft: 'in-memory only' });
    const stop = persist(store, 'app', { keys: ['todos'] });

    store.todos = [{ id: 1 }];
    store.draft = 'changed';
    await tick();

    expect(JSON.parse(localStorage.getItem('app'))).toEqual({ todos: [{ id: 1 }] });
    stop();
  });

  it('never persists $-prefixed meta keys by default', async () => {
    const store = state({ count: 0 });
    const stop = persist(store, 'app');

    store.count = 1;
    await tick();

    const saved = JSON.parse(localStorage.getItem('app'));
    expect(Object.keys(saved)).toEqual(['count']);
    stop();
  });

  it('accepts a custom Storage-like object (e.g. sessionStorage)', async () => {
    const backing = new Map();
    const fakeStorage = {
      getItem: k => (backing.has(k) ? backing.get(k) : null),
      setItem: (k, v) => backing.set(k, v),
    };
    const store = state({ count: 0 });
    const stop = persist(store, 'app', { storage: fakeStorage });

    store.count = 7;
    await tick();

    expect(JSON.parse(backing.get('app'))).toEqual({ count: 7 });
    stop();
  });

  it('disables itself with a warning when no storage is available (SSR)', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const store = state({ count: 0 });

    const stop = persist(store, 'app', { storage: null });

    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('no storage available')
    );
    store.count = 1;
    await tick();
    expect(localStorage.getItem('app')).toBeNull();

    stop(); // no-op dispose must be safe
    warnSpy.mockRestore();
  });

  it('disables itself when localStorage does not exist at all (Node-like)', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const original = Object.getOwnPropertyDescriptor(window, 'localStorage');
    Object.defineProperty(window, 'localStorage', { configurable: true, value: undefined });

    try {
      const store = state({ count: 0 });
      const stop = persist(store, 'app');
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('no storage available')
      );
      stop();
    } finally {
      Object.defineProperty(window, 'localStorage', original);
      warnSpy.mockRestore();
    }
  });

  it('survives environments where touching localStorage throws (blocked iframes)', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    // Simulate Chrome's SecurityError on localStorage access when
    // third-party cookies/storage are blocked.
    const original = Object.getOwnPropertyDescriptor(window, 'localStorage');
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      get() { throw new Error('SecurityError: access denied'); },
    });

    try {
      const store = state({ count: 0 });
      let stop;
      expect(() => { stop = persist(store, 'app'); }).not.toThrow();
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('no storage available')
      );
      stop();
    } finally {
      Object.defineProperty(window, 'localStorage', original);
      warnSpy.mockRestore();
    }
  });

  it('starts fresh on corrupted JSON with a warning', async () => {
    localStorage.setItem('app', '{not valid json');
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const store = state({ count: 0 });

    const stop = persist(store, 'app');

    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('could not read "app"')
    );
    expect(store.count).toBe(0);

    store.count = 3;
    await tick();
    expect(JSON.parse(localStorage.getItem('app'))).toEqual({ count: 3 });

    warnSpy.mockRestore();
    stop();
  });

  it('ignores stored values that are not a plain object', () => {
    localStorage.setItem('app', JSON.stringify([1, 2, 3]));
    const store = state({ count: 0 });

    const stop = persist(store, 'app');
    expect(store.count).toBe(0);
    stop();

    localStorage.setItem('app', JSON.stringify(42));
    const stop2 = persist(store, 'app');
    expect(store.count).toBe(0);
    stop2();
  });

  it('warns and skips the save when state is not serializable', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const circular = {};
    circular.self = circular;
    const store = state({ data: circular }); // unserializable from the start

    const stop = persist(store, 'app');

    store.data = { self: store.data }; // still circular? no — new object holding old circular
    store.data = circular; // back to circular reference
    await tick();

    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('state not serializable'),
      expect.any(Error)
    );
    expect(localStorage.getItem('app')).toBeNull();

    warnSpy.mockRestore();
    stop();
  });

  it('warns when storage writes fail (quota)', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const fullStorage = {
      getItem: () => null,
      setItem: () => { throw new Error('QuotaExceededError'); },
    };
    const store = state({ count: 0 });
    const stop = persist(store, 'app', { storage: fullStorage });

    store.count = 1;
    await tick();

    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('could not write'),
      expect.any(Error)
    );

    warnSpy.mockRestore();
    stop();
  });

  it('stops saving after dispose, even with a flush already pending', async () => {
    const store = state({ count: 0 });
    const stop = persist(store, 'app');

    store.count = 1;
    await tick();
    expect(JSON.parse(localStorage.getItem('app'))).toEqual({ count: 1 });

    store.count = 2;
    stop(); // dispose while the store flush + save microtask are pending
    await tick();

    expect(JSON.parse(localStorage.getItem('app'))).toEqual({ count: 1 });
  });

  it('a save already scheduled at dispose time is cancelled', async () => {
    const store = state({ count: 0 });
    const stop = persist(store, 'app');

    store.count = 1;
    await Promise.resolve(); // store flush ran → save microtask is now queued
    stop();                  // dispose before the save microtask executes
    await tick();

    expect(localStorage.getItem('app')).toBeNull();
  });
});
