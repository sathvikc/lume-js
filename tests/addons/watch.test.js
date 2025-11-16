import { describe, it, expect, vi } from 'vitest';
import { state } from 'src/core/state.js';
import { watch } from 'src/addons/watch.js';

describe('watch', () => {
  it('delegates to $subscribe and returns unsubscribe', async () => {
    const store = state({ msg: 'a' });
    const spy = vi.fn();

    const unwatch = watch(store, 'msg', spy);
    // immediate call
    expect(spy).toHaveBeenCalledWith('a');

    spy.mockClear();
    store.msg = 'b';
    await Promise.resolve(); // Wait for microtask batch
    expect(spy).toHaveBeenCalledWith('b');

    spy.mockClear();
    unwatch();
    store.msg = 'c';
    await Promise.resolve(); // Wait for microtask batch
    expect(spy).not.toHaveBeenCalled();
  });

  it('throws if not a state store', () => {
    expect(() => watch({}, 'x', () => {})).toThrow('store must be created with state()');
  });
});
