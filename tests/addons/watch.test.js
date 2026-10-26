import { describe, it, expect, vi } from 'vitest';
import { state } from 'src/core/state.js';
import { batch } from 'src/core/batch.js';
import { watch } from 'src/addons/watch.js';

describe('watch', () => {
  it('delegates to $subscribe and returns unsubscribe', async () => {
    const store = state({ msg: 'a' });
    const spy = vi.fn();

    const unwatch = watch(store, 'msg', spy);
    expect(spy).toHaveBeenCalledWith('a', undefined);

    spy.mockClear();
    store.msg = 'b';
    await Promise.resolve();
    expect(spy).toHaveBeenCalledWith('b', 'a');

    spy.mockClear();
    unwatch();
    store.msg = 'c';
    await Promise.resolve();
    expect(spy).not.toHaveBeenCalled();
  });

  it('throws if not a state store', () => {
    expect(() => watch({}, 'x', () => {})).toThrow('store must be created with state()');
  });

  describe('{ immediate: false }', () => {
    it('does not call callback on subscribe', () => {
      const store = state({ count: 0 });
      const spy = vi.fn();

      watch(store, 'count', spy, { immediate: false });
      expect(spy).not.toHaveBeenCalled();
    });

    it('calls callback on subsequent changes', async () => {
      const store = state({ count: 0 });
      const spy = vi.fn();

      watch(store, 'count', spy, { immediate: false });
      store.count = 1;
      await Promise.resolve();
      expect(spy).toHaveBeenCalledTimes(1);
      expect(spy).toHaveBeenCalledWith(1, 0);
    });

    it('skips only the very first call, not subsequent ones', async () => {
      const store = state({ x: 'a' });
      const spy = vi.fn();

      watch(store, 'x', spy, { immediate: false });
      store.x = 'b';
      await Promise.resolve();
      store.x = 'c';
      await Promise.resolve();
      expect(spy).toHaveBeenCalledTimes(2);
      expect(spy).toHaveBeenNthCalledWith(1, 'b', 'a');
      expect(spy).toHaveBeenNthCalledWith(2, 'c', 'b');
    });

    it('returned unsubscribe stops future calls', async () => {
      const store = state({ val: 0 });
      const spy = vi.fn();

      const stop = watch(store, 'val', spy, { immediate: false });
      stop();
      store.val = 99;
      await Promise.resolve();
      expect(spy).not.toHaveBeenCalled();
    });

    it('default behavior (immediate: true) still fires on subscribe', () => {
      const store = state({ n: 5 });
      const spy = vi.fn();

      watch(store, 'n', spy);
      expect(spy).toHaveBeenCalledWith(5, undefined);

      watch(store, 'n', spy, { immediate: true });
      expect(spy).toHaveBeenCalledTimes(2);
    });
  });

  describe('previous value', () => {
    it('is the last value delivered, not every intermediate write', async () => {
      const store = state({ status: 'idle' });
      const spy = vi.fn();

      watch(store, 'status', spy);
      store.status = 'loading';
      store.status = 'done'; // coalesced with 'loading' in one flush
      await Promise.resolve();
      expect(spy).toHaveBeenLastCalledWith('done', 'idle');

      batch(() => {
        store.status = 'idle';
        store.status = 'error';
      });
      expect(spy).toHaveBeenLastCalledWith('error', 'done');
      expect(spy).toHaveBeenCalledTimes(3);
    });

    it('is tracked per watcher', async () => {
      const store = state({ n: 1 });
      const early = vi.fn();
      watch(store, 'n', early);
      store.n = 2;
      await Promise.resolve();

      const late = vi.fn();
      watch(store, 'n', late, { immediate: false });
      store.n = 3;
      await Promise.resolve();

      expect(early).toHaveBeenLastCalledWith(3, 2);
      expect(late).toHaveBeenCalledWith(3, 2);
    });

    it('still works with one-argument callbacks', async () => {
      const store = state({ v: 'x' });
      const seen = [];
      watch(store, 'v', (val) => seen.push(val));
      store.v = 'y';
      await Promise.resolve();
      expect(seen).toEqual(['x', 'y']);
    });

    it('reports the replaced nested state as previous; in-place edits do not fire', async () => {
      const store = state({ user: state({ name: 'A' }) });
      const spy = vi.fn();
      watch(store, 'user', spy, { immediate: false });
      store.user.name = 'A2'; // writes the nested store, not store.user
      await Promise.resolve();
      expect(spy).not.toHaveBeenCalled();

      const prev = store.user;
      const next = state({ name: 'B' });
      store.user = next;
      await Promise.resolve();
      expect(spy.mock.calls[0][0]).toBe(next);
      expect(spy.mock.calls[0][1]).toBe(prev);
    });
  });
});
