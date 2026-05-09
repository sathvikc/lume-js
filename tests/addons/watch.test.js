import { describe, it, expect, vi } from 'vitest';
import { state } from 'src/core/state.js';
import { watch } from 'src/addons/watch.js';

describe('watch', () => {
  it('delegates to $subscribe and returns unsubscribe', async () => {
    const store = state({ msg: 'a' });
    const spy = vi.fn();

    const unwatch = watch(store, 'msg', spy);
    expect(spy).toHaveBeenCalledWith('a');

    spy.mockClear();
    store.msg = 'b';
    await Promise.resolve();
    expect(spy).toHaveBeenCalledWith('b');

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
      expect(spy).toHaveBeenCalledWith(1);
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
      expect(spy).toHaveBeenNthCalledWith(1, 'b');
      expect(spy).toHaveBeenNthCalledWith(2, 'c');
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
      expect(spy).toHaveBeenCalledWith(5);

      watch(store, 'n', spy, { immediate: true });
      expect(spy).toHaveBeenCalledTimes(2);
    });
  });
});
