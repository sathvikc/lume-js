import { describe, it, expect, vi } from 'vitest';
import { createCleanupGroup } from 'src/addons/cleanupGroup.js';

describe('createCleanupGroup', () => {
  it('creates a group with add and dispose methods', () => {
    const group = createCleanupGroup();
    expect(typeof group.add).toBe('function');
    expect(typeof group.dispose).toBe('function');
  });

  it('calls all added cleanup functions on dispose', () => {
    const group = createCleanupGroup();
    const fn1 = vi.fn();
    const fn2 = vi.fn();

    group.add(fn1);
    group.add(fn2);
    group.dispose();

    expect(fn1).toHaveBeenCalledTimes(1);
    expect(fn2).toHaveBeenCalledTimes(1);
  });

  it('calls cleanup functions in LIFO order', () => {
    const group = createCleanupGroup();
    const order = [];

    group.add(() => order.push(1));
    group.add(() => order.push(2));
    group.dispose();

    expect(order).toEqual([2, 1]);
  });

  it('ignores non-function values passed to add', () => {
    const group = createCleanupGroup();
    const fn = vi.fn();

    group.add(fn);
    group.add(null);
    group.add(undefined);
    group.add('string');
    group.add(42);
    group.dispose();

    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('is safe to dispose multiple times', () => {
    const group = createCleanupGroup();
    const fn = vi.fn();

    group.add(fn);
    group.dispose();
    group.dispose();

    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('ignores cleanup function errors and continues', () => {
    const group = createCleanupGroup();
    const fn1 = vi.fn(() => { throw new Error('cleanup error'); });
    const fn2 = vi.fn();

    group.add(fn1);
    group.add(fn2);

    expect(() => group.dispose()).not.toThrow();
    expect(fn2).toHaveBeenCalledTimes(1);
  });

  it('allows adding more cleanups after a dispose', () => {
    const group = createCleanupGroup();
    const fn1 = vi.fn();
    const fn2 = vi.fn();

    group.add(fn1);
    group.dispose();
    group.add(fn2);
    group.dispose();

    expect(fn1).toHaveBeenCalledTimes(1);
    expect(fn2).toHaveBeenCalledTimes(1);
  });
});
