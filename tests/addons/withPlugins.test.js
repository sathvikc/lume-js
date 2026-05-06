import { describe, it, expect, vi } from 'vitest';
import { state } from 'src/core/state.js';
import { withPlugins } from 'src/addons/withPlugins.js';
import { isReactive } from 'src/addons/index.js';

describe('withPlugins', () => {
  describe('basic plugin functionality', () => {
    it('calls onInit when withPlugins is called', () => {
      const onInit = vi.fn();
      withPlugins(state({ count: 0 }), [{ name: 'test', onInit }]);
      expect(onInit).toHaveBeenCalledTimes(1);
    });

    it('calls onGet when property is accessed', () => {
      const onGet = vi.fn((key, value) => value);
      const store = withPlugins(state({ count: 5 }), [{ name: 'test', onGet }]);
      const val = store.count;
      expect(onGet).toHaveBeenCalledWith('count', 5);
      expect(val).toBe(5);
    });

    it('calls onSet when property is updated', () => {
      const onSet = vi.fn((key, newValue) => newValue);
      const store = withPlugins(state({ count: 0 }), [{ name: 'test', onSet }]);
      store.count = 10;
      expect(onSet).toHaveBeenCalledWith('count', 10, 0);
    });

    it('calls onSubscribe when $subscribe is called', () => {
      const onSubscribe = vi.fn();
      const store = withPlugins(state({ count: 0 }), [{ name: 'test', onSubscribe }]);
      store.$subscribe('count', () => { });
      expect(onSubscribe).toHaveBeenCalledWith('count');
    });

    it('calls onNotify before subscribers are notified', async () => {
      const callOrder = [];
      const plugin = {
        name: 'test',
        onNotify: vi.fn((key) => { if (key === 'count') callOrder.push('plugin'); })
      };
      const store = withPlugins(state({ count: 0 }), [plugin]);
      store.$subscribe('count', () => callOrder.push('subscriber'));
      callOrder.length = 0;

      store.count = 5;
      await Promise.resolve();
      await Promise.resolve(); // withPlugins flush + state flush

      expect(callOrder[0]).toBe('plugin');
      expect(callOrder).toContain('subscriber');
      expect(plugin.onNotify).toHaveBeenCalledWith('count', 5);
    });
  });

  describe('plugin chain pattern', () => {
    it('onGet chains values through multiple plugins', () => {
      const plugin1 = { name: 'double', onGet: (key, value) => typeof value === 'number' ? value * 2 : value };
      const plugin2 = { name: 'add10', onGet: (key, value) => typeof value === 'number' ? value + 10 : value };
      const store = withPlugins(state({ count: 5 }), [plugin1, plugin2]);
      expect(store.count).toBe(20); // 5 → *2=10 → +10=20
    });

    it('onSet chains values through multiple plugins', () => {
      const plugin1 = { name: 'min', onSet: (key, value) => Math.max(0, value) };
      const plugin2 = { name: 'max', onSet: (key, value) => Math.min(100, value) };
      const store = withPlugins(state({ count: 0 }), [plugin1, plugin2]);
      store.count = -50;
      expect(store.count).toBe(0);
      store.count = 200;
      expect(store.count).toBe(100);
      store.count = 50;
      expect(store.count).toBe(50);
    });

    it('plugin order matters in chain', () => {
      const double = { name: 'double', onSet: (key, value) => value * 2 };
      const add10 = { name: 'add10', onSet: (key, value) => value + 10 };

      const store1 = withPlugins(state({ x: 0 }), [double, add10]);
      store1.x = 5;
      expect(store1.x).toBe(20); // (5*2)+10

      const store2 = withPlugins(state({ x: 0 }), [add10, double]);
      store2.x = 5;
      expect(store2.x).toBe(30); // (5+10)*2
    });
  });

  describe('error handling', () => {
    it('continues when plugin onInit throws', () => {
      const spy = vi.spyOn(console, 'error').mockImplementation(() => { });
      const store = withPlugins(state({ count: 0 }), [{ name: 'broken', onInit: () => { throw new Error('Init failed!'); } }]);
      expect(store.count).toBe(0);
      store.count = 5;
      expect(store.count).toBe(5);
      expect(spy).toHaveBeenCalledWith(expect.stringContaining('[Lume.js] Plugin "broken" error in onInit:'), expect.any(Error));
      spy.mockRestore();
    });

    it('continues when plugin onGet throws', () => {
      const spy = vi.spyOn(console, 'error').mockImplementation(() => { });
      const store = withPlugins(state({ count: 10 }), [{ name: 'broken', onGet: () => { throw new Error('Get failed!'); } }]);
      expect(store.count).toBe(10);
      expect(spy).toHaveBeenCalledWith(expect.stringContaining('[Lume.js] Plugin "broken" error in onGet:'), expect.any(Error));
      spy.mockRestore();
    });

    it('continues when plugin onSet throws', () => {
      const spy = vi.spyOn(console, 'error').mockImplementation(() => { });
      const store = withPlugins(state({ count: 0 }), [{ name: 'broken', onSet: () => { throw new Error('Set failed!'); } }]);
      store.count = 5;
      expect(store.count).toBe(5);
      expect(spy).toHaveBeenCalledWith(expect.stringContaining('[Lume.js] Plugin "broken" error in onSet:'), expect.any(Error));
      spy.mockRestore();
    });

    it('continues when plugin onNotify throws', async () => {
      const spy = vi.spyOn(console, 'error').mockImplementation(() => { });
      const store = withPlugins(state({ count: 0 }), [{ name: 'broken', onNotify: () => { throw new Error('Notify failed!'); } }]);
      const subscriber = vi.fn();
      store.$subscribe('count', subscriber);
      subscriber.mockClear();
      store.count = 5;
      await Promise.resolve();
      await Promise.resolve();
      expect(subscriber).toHaveBeenCalledWith(5);
      expect(spy).toHaveBeenCalledWith(expect.stringContaining('[Lume.js] Plugin "broken" error in onNotify:'), expect.any(Error));
      spy.mockRestore();
    });

    it('continues when plugin onSubscribe throws', () => {
      const spy = vi.spyOn(console, 'error').mockImplementation(() => { });
      const store = withPlugins(state({ count: 0 }), [{ name: 'broken', onSubscribe: () => { throw new Error('Subscribe failed!'); } }]);
      const subscriber = vi.fn();
      store.$subscribe('count', subscriber);
      expect(subscriber).toHaveBeenCalledWith(0);
      expect(spy).toHaveBeenCalledWith(expect.stringContaining('[Lume.js] Plugin "broken" error in onSubscribe:'), expect.any(Error));
      spy.mockRestore();
    });

    it('handles plugin with missing name property', () => {
      const spy = vi.spyOn(console, 'error').mockImplementation(() => { });
      const store = withPlugins(state({ count: 5 }), [{ onGet: () => { throw new Error('Boom!'); } }]);
      const val = store.count;
      expect(val).toBe(5);
      expect(spy).toHaveBeenCalledWith(expect.stringContaining('[Lume.js] Plugin "undefined" error in onGet:'), expect.any(Error));
      spy.mockRestore();
    });

    it('one plugin error does not stop other plugins', () => {
      const spy = vi.spyOn(console, 'error').mockImplementation(() => { });
      const working1 = { name: 'working', onGet: vi.fn((key, value) => value * 2) };
      const broken = { name: 'broken', onGet: () => { throw new Error('Broken!'); } };
      const working2 = { name: 'another', onGet: vi.fn((key, value) => value + 10) };
      const store = withPlugins(state({ count: 5 }), [working1, broken, working2]);
      expect(store.count).toBe(20); // 5 → *2=10 → broken (stays 10) → +10=20
      expect(working1.onGet).toHaveBeenCalled();
      expect(working2.onGet).toHaveBeenCalled();
      spy.mockRestore();
    });
  });

  describe('edge cases', () => {
    it('returns store unchanged when plugins array is empty', () => {
      const store = state({ count: 0 });
      expect(withPlugins(store, [])).toBe(store);
    });

    it('works with no plugins argument', () => {
      const store = state({ count: 0 });
      expect(withPlugins(store)).toBe(store);
    });

    it('handles plugin that returns undefined from onGet (pass-through)', () => {
      const store = withPlugins(state({ count: 5 }), [{ name: 'test', onGet: () => undefined }]);
      expect(store.count).toBe(5);
    });

    it('handles plugin that returns null from onGet', () => {
      const store = withPlugins(state({ count: 5 }), [{ name: 'test', onGet: () => null }]);
      expect(store.count).toBe(null);
    });

    it('handles plugin that returns 0 from onGet', () => {
      const store = withPlugins(state({ count: 5 }), [{ name: 'test', onGet: () => 0 }]);
      expect(store.count).toBe(0);
    });

    it('handles plugin that returns empty string from onGet', () => {
      const store = withPlugins(state({ name: 'test' }), [{ name: 'test', onGet: () => '' }]);
      expect(store.name).toBe('');
    });

    it('handles plugin that does not return from onSet (uses original value)', () => {
      const store = withPlugins(state({ count: 0 }), [{ name: 'test', onSet: () => undefined }]);
      store.count = 10;
      expect(store.count).toBe(10);
    });

    it('plugin can prevent updates by returning oldValue from onSet', () => {
      const store = withPlugins(state({ count: 0 }), [{ name: 'immutable', onSet: (key, newVal, oldVal) => oldVal }]);
      store.count = 10;
      expect(store.count).toBe(0);
    });

    it('handles large plugin chain (10 plugins)', () => {
      const plugins = Array.from({ length: 10 }, (_, i) => ({
        name: `plugin${i}`,
        onGet: (key, value) => typeof value === 'number' ? value + 1 : value
      }));
      const store = withPlugins(state({ count: 0 }), plugins);
      expect(store.count).toBe(10);
    });

    it('plugin hooks with all lifecycle methods work', () => {
      const plugin = {
        name: 'test',
        onInit: vi.fn(),
        onGet: vi.fn(),
        onSet: vi.fn(),
        onSubscribe: vi.fn(),
        onNotify: vi.fn()
      };
      const store = withPlugins(state({ count: 0 }), [plugin]);
      void store.count; // trigger onGet
      store.count = 5;
      store.$subscribe('count', () => { });
      expect(plugin.onInit).toHaveBeenCalled();
      expect(plugin.onGet).toHaveBeenCalled();
      expect(plugin.onSet).toHaveBeenCalled();
      expect(plugin.onSubscribe).toHaveBeenCalled();
    });
  });

  describe('$-prefixed key passthrough', () => {
    it('passes through non-$subscribe $-prefixed keys without interception', () => {
      const onGet = vi.fn((key, value) => 'intercepted');
      const store = state({ x: 1 });
      // Manually attach another $-prefixed meta property to the raw object
      store.$custom = 'hello';
      const wrapped = withPlugins(store, [{ name: 'test', onGet }]);
      // $custom is $-prefixed but not $subscribe — should pass through, not call onGet
      expect(wrapped.$custom).toBe('hello');
      expect(onGet).not.toHaveBeenCalledWith('$custom', expect.anything());
    });
  });

  describe('plugin isolation', () => {
    it('plugins are scoped to their wrapped store instance', () => {
      const plugin1 = { name: 'store1-plugin', onGet: vi.fn((key, value) => value) };
      const plugin2 = { name: 'store2-plugin', onGet: vi.fn((key, value) => value) };

      const store1 = withPlugins(state({ count: 0 }), [plugin1]);
      const store2 = withPlugins(state({ count: 0 }), [plugin2]);

      store1.count;
      store2.count;

      expect(plugin1.onGet).toHaveBeenCalled();
      expect(plugin2.onGet).toHaveBeenCalled();

      plugin1.onGet.mockClear();
      plugin2.onGet.mockClear();

      store1.count;
      expect(plugin1.onGet).toHaveBeenCalled();
      expect(plugin2.onGet).not.toHaveBeenCalled();
    });

    it('plugin does not affect $subscribe meta method interception', () => {
      const plugin = { name: 'test', onGet: vi.fn(() => 'intercepted') };
      const store = withPlugins(state({ count: 0 }), [plugin]);
      const fn = store.$subscribe;
      expect(typeof fn).toBe('function');
      expect(plugin.onGet).not.toHaveBeenCalledWith('$subscribe', expect.anything());
    });

    it('wrapped store is still detected as reactive', () => {
      const store = withPlugins(state({ count: 0 }), [{ name: 'test', onGet: () => false }]);
      expect(isReactive(store)).toBe(true);
    });
  });

  describe('real-world plugin examples', () => {
    it('debug plugin logs all operations', async () => {
      const logs = [];
      const debugPlugin = {
        name: 'debug',
        onInit: () => logs.push('INIT'),
        onGet: (key, value) => { logs.push(`GET ${key}: ${value}`); return value; },
        onSet: (key, newValue, oldValue) => { logs.push(`SET ${key}: ${oldValue} → ${newValue}`); return newValue; },
        onSubscribe: (key) => logs.push(`SUBSCRIBE ${key}`),
        onNotify: (key, value) => logs.push(`NOTIFY ${key}: ${value}`)
      };

      const store = withPlugins(state({ count: 0 }), [debugPlugin]);
      store.$subscribe('count', () => { });
      store.count;
      store.count = 5;
      await Promise.resolve();
      await Promise.resolve();

      expect(logs).toContain('INIT');
      expect(logs).toContain('SUBSCRIBE count');
      expect(logs).toContain('GET count: 0');
      expect(logs).toContain('SET count: 0 → 5');
      expect(logs).toContain('NOTIFY count: 5');
    });

    it('validation plugin prevents invalid values', () => {
      const validationPlugin = {
        name: 'validate',
        onSet: (key, newValue, oldValue) => {
          if (key === 'age' && (newValue < 0 || newValue > 150)) return oldValue;
          return newValue;
        }
      };
      const store = withPlugins(state({ age: 25 }), [validationPlugin]);
      store.age = 30;
      expect(store.age).toBe(30);
      store.age = -5;
      expect(store.age).toBe(30);
      store.age = 200;
      expect(store.age).toBe(30);
    });

    it('onNotify does not fire when onSet blocks the update', async () => {
      const onNotify = vi.fn();
      const validationPlugin = {
        name: 'validate',
        onSet: (key, newValue, oldValue) => {
          if (key === 'age' && newValue < 0) return oldValue;
          return newValue;
        },
        onNotify
      };
      const store = withPlugins(state({ age: 25 }), [validationPlugin]);
      const spy = vi.fn();
      store.$subscribe('age', spy);
      spy.mockClear();
      onNotify.mockClear();

      store.age = -5; // blocked by onSet
      await Promise.resolve();
      await Promise.resolve();

      expect(store.age).toBe(25);
      expect(onNotify).not.toHaveBeenCalled();
      expect(spy).not.toHaveBeenCalled();

      store.age = 30; // allowed
      await Promise.resolve();
      await Promise.resolve();

      expect(onNotify).toHaveBeenCalledWith('age', 30);
      expect(spy).toHaveBeenCalledWith(30);
    });

    it('history plugin tracks changes', async () => {
      const history = [];
      const historyPlugin = {
        name: 'history',
        onNotify: (key, value) => { if (key === 'count') history.push({ key, value }); }
      };
      const store = withPlugins(state({ count: 0 }), [historyPlugin]);
      store.count = 1;
      await Promise.resolve();
      await Promise.resolve();
      store.count = 2;
      await Promise.resolve();
      await Promise.resolve();
      store.count = 3;
      await Promise.resolve();
      await Promise.resolve();
      expect(history).toHaveLength(3);
      expect(history[0]).toMatchObject({ key: 'count', value: 1 });
      expect(history[1]).toMatchObject({ key: 'count', value: 2 });
      expect(history[2]).toMatchObject({ key: 'count', value: 3 });
    });

    it('transform plugin normalizes input', () => {
      const normalizePlugin = {
        name: 'normalize',
        onSet: (key, newValue) => {
          if (key === 'email' && typeof newValue === 'string') return newValue.toLowerCase().trim();
          return newValue;
        }
      };
      const store = withPlugins(state({ email: '' }), [normalizePlugin]);
      store.email = '  TEST@EXAMPLE.COM  ';
      expect(store.email).toBe('test@example.com');
    });

    it('computed plugin adds derived values via onGet', () => {
      const computedPlugin = {
        name: 'computed',
        onGet: (key, value) => {
          if (key === 'fullName') return 'Computed Value';
          return value;
        }
      };
      const store = withPlugins(state({ firstName: 'John', lastName: 'Doe' }), [computedPlugin]);
      expect(store.fullName).toBe('Computed Value');
    });
  });

  describe('cleanup', () => {
    it('$dispose removes the beforeFlush hook', async () => {
      const onNotify = vi.fn();
      const store = withPlugins(state({ count: 0 }), [{ name: 'test', onNotify }]);

      store.$dispose();
      store.count = 5;
      await Promise.resolve();
      await Promise.resolve();

      expect(onNotify).not.toHaveBeenCalled();
    });

    it('wrapping the same store multiple times does not leak hooks', async () => {
      const onNotify1 = vi.fn();
      const onNotify2 = vi.fn();
      const base = state({ count: 0 });

      const wrapped1 = withPlugins(base, [{ name: 'p1', onNotify: onNotify1 }]);
      const wrapped2 = withPlugins(base, [{ name: 'p2', onNotify: onNotify2 }]);

      // Mutate through wrapped1 — only its pending map is populated
      wrapped1.count = 1;
      await Promise.resolve();
      await Promise.resolve();

      expect(onNotify1).toHaveBeenCalledTimes(1);
      expect(onNotify2).toHaveBeenCalledTimes(0);

      wrapped1.$dispose();

      // Mutate through wrapped2 after wrapped1 is disposed
      wrapped2.count = 2;
      await Promise.resolve();
      await Promise.resolve();

      // wrapped1's hook removed, wrapped2 still active
      expect(onNotify1).toHaveBeenCalledTimes(1);
      expect(onNotify2).toHaveBeenCalledTimes(1);
    });
  });

  describe('$subscribe passthrough', () => {
    it('does not trigger onSet via $subscribe assignment', () => {
      const setKeys = [];
      const plugin = { name: 'spy', onSet: (key, newValue) => { setKeys.push(key); return newValue; } };
      withPlugins(state({ count: 0 }), [plugin]);
      expect(setKeys).not.toContain('$subscribe');
    });

    it('does not trigger onNotify via $subscribe assignment', async () => {
      const notifyKeys = [];
      const plugin = { name: 'spy', onNotify: (key) => notifyKeys.push(key) };
      withPlugins(state({ count: 0 }), [plugin]);
      await Promise.resolve();
      await Promise.resolve();
      expect(notifyKeys).not.toContain('$subscribe');
    });
  });
});
