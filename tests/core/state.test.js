import { describe, it, expect, vi } from 'vitest';
import { state, isReactive } from 'src/core/state.js';

describe('state', () => {
  it('throws for non-object inputs', () => {
    expect(() => state(null)).toThrow('state() requires a plain object');
    expect(() => state(1)).toThrow('state() requires a plain object');
    expect(() => state([])).toThrow('state() requires a plain object');
  });

  it('gets and sets properties', () => {
    const store = state({ count: 0 });
    expect(store.count).toBe(0);
    store.count = 2;
    expect(store.count).toBe(2);
  });

  it('notifies subscribers only on change', async () => {
    const store = state({ count: 0 });
    const spy = vi.fn();
    store.$subscribe('count', spy);
    // immediate call with current value
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenLastCalledWith(0);

    spy.mockClear();
    // change value triggers notify (batched)
    store.count = 1;
    await Promise.resolve(); // Wait for microtask
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenLastCalledWith(1);

    spy.mockClear();
    // setting same value should not notify again
    store.count = 1;
    await Promise.resolve(); // Wait for microtask
    expect(spy).not.toHaveBeenCalled();
  });

  it('supports unsubscribe', () => {
    const store = state({ name: 'a' });
    const spy = vi.fn();
    const unsub = store.$subscribe('name', spy);
    expect(spy).toHaveBeenCalledWith('a');
    spy.mockClear();

    unsub();
    store.name = 'b';
    expect(spy).not.toHaveBeenCalled();
  });

  it('separate keys have isolated subscriptions', async () => {
    const store = state({ a: 1, b: 2 });
    const spyA = vi.fn();
    const spyB = vi.fn();
    store.$subscribe('a', spyA);
    store.$subscribe('b', spyB);
    spyA.mockClear();
    spyB.mockClear();

    store.a = 10;
    await Promise.resolve(); // Wait for microtask
    expect(spyA).toHaveBeenCalledWith(10);
    expect(spyB).not.toHaveBeenCalled();

    spyA.mockClear();
    store.b = 20;
    await Promise.resolve(); // Wait for microtask
    expect(spyB).toHaveBeenCalledWith(20);
    expect(spyA).not.toHaveBeenCalled();
  });

  it('validates subscriber callback', () => {
    const store = state({ x: 1 });
    // @ts-ignore
    expect(() => store.$subscribe('x', 123)).toThrow('Subscriber must be a function');
  });

  it('batches multiple synchronous changes via microtasks', async () => {
    const store = state({ count: 0 });
    const spy = vi.fn();
    store.$subscribe('count', spy);
    spy.mockClear(); // Clear the initial call
    
    // Make multiple synchronous changes
    store.count = 1;
    store.count = 2;
    store.count = 3;
    
    // Should not have called the subscriber yet (batched)
    expect(spy).not.toHaveBeenCalled();
    
    // Wait for microtask to flush
    await Promise.resolve();
    
    // Should only be called once with the final value
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith(3);
  });

  it('batches changes for multiple subscribers of same key', async () => {
    const store = state({ value: 'initial' });
    const spy1 = vi.fn();
    const spy2 = vi.fn();
    
    store.$subscribe('value', spy1);
    store.$subscribe('value', spy2);
    spy1.mockClear();
    spy2.mockClear();
    
    // Multiple changes
    store.value = 'a';
    store.value = 'b';
    store.value = 'final';
    
    // Nothing called yet (batched)
    expect(spy1).not.toHaveBeenCalled();
    expect(spy2).not.toHaveBeenCalled();
    
    // Wait for microtask
    await Promise.resolve();
    
    // Both should be called once with final value
    expect(spy1).toHaveBeenCalledTimes(1);
    expect(spy1).toHaveBeenCalledWith('final');
    expect(spy2).toHaveBeenCalledTimes(1);
    expect(spy2).toHaveBeenCalledWith('final');
  });

  it('handles multiple keys independently in batching', async () => {
    const store = state({ a: 1, b: 'x' });
    const spyA = vi.fn();
    const spyB = vi.fn();
    
    store.$subscribe('a', spyA);
    store.$subscribe('b', spyB);
    spyA.mockClear();
    spyB.mockClear();
    
    // Change both keys multiple times
    store.a = 10;
    store.b = 'y';
    store.a = 20;
    store.b = 'z';
    
    // Nothing called yet
    expect(spyA).not.toHaveBeenCalled();
    expect(spyB).not.toHaveBeenCalled();
    
    // Wait for microtask
    await Promise.resolve();
    
    // Each should be called once with final values
    expect(spyA).toHaveBeenCalledTimes(1);
    expect(spyA).toHaveBeenCalledWith(20);
    expect(spyB).toHaveBeenCalledTimes(1);
    expect(spyB).toHaveBeenCalledWith('z');
  });

  it('invokes all subscribers scheduled at flush even if one unsubscribes another during notification', async () => {
    const store = state({ val: 0 });

    let firstCalls = 0;
    let secondCalls = 0;
    let unsubSecond;

    // Second subscriber (will potentially be removed by first during first flush)
    unsubSecond = store.$subscribe('val', () => {
      secondCalls++;
    });

    // First subscriber unsubscribes second ONLY during the flush (value === 1)
    store.$subscribe('val', (v) => {
      firstCalls++;
      if (v === 1) {
        unsubSecond(); // unsubscribe second inside notification callback
      }
    });

    // Clear initial immediate call counts (both subscribers saw initial value 0 already)
    expect(firstCalls).toBe(1); // immediate
    expect(secondCalls).toBe(1); // immediate

    // Trigger first flush with value 1 – both should be called; second then unsubscribed
    store.val = 1;
    await Promise.resolve();
    expect(firstCalls).toBe(2); // immediate + flush
    expect(secondCalls).toBe(2); // still called this flush even though unsubscribed inside first callback

    // Trigger second flush with value 2 – only first should run now
    store.val = 2;
    await Promise.resolve();
    expect(firstCalls).toBe(3);
    expect(secondCalls).toBe(2); // not incremented

    // This behavior relies on snapshot iteration; without Array.from() capturing listeners
    // at flush start, mutating the listeners list inside a callback could cause skipped execution.
  });

  it('detects reactive proxy with isReactive', () => {
    const original = { count: 1 };
    const store = state(original);
    expect(isReactive(store)).toBe(true);
    expect(isReactive(original)).toBe(false); // original object not reactive
  });

  it('isReactive returns false for primitives and null', () => {
    expect(isReactive(null)).toBe(false);
    expect(isReactive(123)).toBe(false);
    expect(isReactive('str')).toBe(false);
    expect(isReactive(true)).toBe(false);
  });

  it('nested state objects are also detected', () => {
    const inner = state({ a: 1 });
    const outer = state({ inner });
    expect(isReactive(outer)).toBe(true);
    expect(isReactive(inner)).toBe(true);
    expect(isReactive(outer.inner)).toBe(true);
  });

  it('marker is not enumerable on reactive proxy', () => {
    const store = state({ x: 1 });
    expect(Object.keys(store)).not.toContain('__LUME_REACTIVE__');
  });
});

describe('plugin system', () => {
  describe('basic plugin functionality', () => {
    it('calls onInit when state is created', () => {
      const onInit = vi.fn();
      const plugin = { name: 'test', onInit };
      
      state({ count: 0 }, { plugins: [plugin] });
      
      expect(onInit).toHaveBeenCalledTimes(1);
    });

    it('calls onGet when property is accessed', () => {
      const onGet = vi.fn((key, value) => value);
      const plugin = { name: 'test', onGet };
      
      const store = state({ count: 5 }, { plugins: [plugin] });
      const val = store.count;
      
      expect(onGet).toHaveBeenCalledWith('count', 5);
      expect(val).toBe(5);
    });

    it('calls onSet when property is updated', () => {
      const onSet = vi.fn((key, newValue, oldValue) => newValue);
      const plugin = { name: 'test', onSet };
      
      const store = state({ count: 0 }, { plugins: [plugin] });
      store.count = 10;
      
      expect(onSet).toHaveBeenCalledWith('count', 10, 0);
    });

    it('calls onSubscribe when $subscribe is called', () => {
      const onSubscribe = vi.fn();
      const plugin = { name: 'test', onSubscribe };
      
      const store = state({ count: 0 }, { plugins: [plugin] });
      store.$subscribe('count', () => {});
      
      expect(onSubscribe).toHaveBeenCalledWith('count');
    });

    it('calls onNotify before subscribers are notified', async () => {
      const callOrder = [];
      const onNotify = vi.fn((key, value) => {
        if (key === 'count') { // Only track count changes
          callOrder.push('plugin');
        }
      });
      const plugin = { name: 'test', onNotify };
      
      const store = state({ count: 0 }, { plugins: [plugin] });
      const subscriber = vi.fn((value) => {
        callOrder.push('subscriber');
      });
      
      store.$subscribe('count', subscriber);
      // Clear - initial subscribe call adds 'subscriber' synchronously
      callOrder.length = 0;
      
      store.count = 5;
      await Promise.resolve();
      
      // After update: onNotify called once for 'count', then subscriber
      expect(callOrder).toEqual(['plugin', 'subscriber']);
      expect(onNotify).toHaveBeenCalledWith('count', 5);
    });
  });

  describe('plugin chain pattern', () => {
    it('onGet chains values through multiple plugins', () => {
      const plugin1 = {
        name: 'double',
        onGet: (key, value) => typeof value === 'number' ? value * 2 : value
      };
      const plugin2 = {
        name: 'add10',
        onGet: (key, value) => typeof value === 'number' ? value + 10 : value
      };
      
      const store = state({ count: 5 }, { plugins: [plugin1, plugin2] });
      
      // Chain: 5 → double (10) → add10 (20)
      expect(store.count).toBe(20);
    });

    it('onSet chains values through multiple plugins', () => {
      const plugin1 = {
        name: 'validate',
        onSet: (key, value) => Math.max(0, value) // Clamp to minimum 0
      };
      const plugin2 = {
        name: 'cap',
        onSet: (key, value) => Math.min(100, value) // Cap at maximum 100
      };
      
      const store = state({ count: 0 }, { plugins: [plugin1, plugin2] });
      
      store.count = -50;
      expect(store.count).toBe(0); // Clamped by plugin1
      
      store.count = 200;
      expect(store.count).toBe(100); // Capped by plugin2
      
      store.count = 50;
      expect(store.count).toBe(50); // Within range
    });

    it('plugin order matters in chain', () => {
      const double = {
        name: 'double',
        onSet: (key, value) => value * 2
      };
      const add10 = {
        name: 'add10',
        onSet: (key, value) => value + 10
      };
      
      const store1 = state({ x: 0 }, { plugins: [double, add10] });
      store1.x = 5; // (5 * 2) + 10 = 20
      expect(store1.x).toBe(20);
      
      const store2 = state({ x: 0 }, { plugins: [add10, double] });
      store2.x = 5; // (5 + 10) * 2 = 30
      expect(store2.x).toBe(30);
    });
  });

  describe('error handling', () => {
    it('continues when plugin onInit throws', () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      const brokenPlugin = {
        name: 'broken',
        onInit: () => { throw new Error('Init failed!'); }
      };
      
      // Should not throw - error is caught
      const store = state({ count: 0 }, { plugins: [brokenPlugin] });
      
      // State should still work
      expect(store.count).toBe(0);
      store.count = 5;
      expect(store.count).toBe(5);
      
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('[Lume.js] Plugin "broken" error in onInit:'),
        expect.any(Error)
      );
      
      consoleErrorSpy.mockRestore();
    });

    it('continues when plugin onGet throws', () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      const brokenPlugin = {
        name: 'broken',
        onGet: () => { throw new Error('Get failed!'); }
      };
      
      const store = state({ count: 10 }, { plugins: [brokenPlugin] });
      
      // Should return original value even though plugin threw
      expect(store.count).toBe(10);
      
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('[Lume.js] Plugin "broken" error in onGet:'),
        expect.any(Error)
      );
      
      consoleErrorSpy.mockRestore();
    });

    it('continues when plugin onSet throws', () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      const brokenPlugin = {
        name: 'broken',
        onSet: () => { throw new Error('Set failed!'); }
      };
      
      const store = state({ count: 0 }, { plugins: [brokenPlugin] });
      
      // Should still update with original value
      store.count = 5;
      expect(store.count).toBe(5);
      
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('[Lume.js] Plugin "broken" error in onSet:'),
        expect.any(Error)
      );
      
      consoleErrorSpy.mockRestore();
    });

    it('continues when plugin onNotify throws', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      const brokenPlugin = {
        name: 'broken',
        onNotify: () => { throw new Error('Notify failed!'); }
      };
      
      const store = state({ count: 0 }, { plugins: [brokenPlugin] });
      const subscriber = vi.fn();
      store.$subscribe('count', subscriber);
      
      subscriber.mockClear();
      store.count = 5;
      await Promise.resolve();
      
      // Subscriber should still be called despite plugin error
      expect(subscriber).toHaveBeenCalledWith(5);
      
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('[Lume.js] Plugin "broken" error in onNotify:'),
        expect.any(Error)
      );
      
      consoleErrorSpy.mockRestore();
    });

    it('continues when plugin onSubscribe throws', () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      const brokenPlugin = {
        name: 'broken',
        onSubscribe: () => { throw new Error('Subscribe failed!'); }
      };
      
      const store = state({ count: 0 }, { plugins: [brokenPlugin] });
      const subscriber = vi.fn();
      
      // Should not throw
      store.$subscribe('count', subscriber);
      
      // Subscription should still work
      expect(subscriber).toHaveBeenCalledWith(0);
      
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('[Lume.js] Plugin "broken" error in onSubscribe:'),
        expect.any(Error)
      );
      
      consoleErrorSpy.mockRestore();
    });

    it('handles plugin with missing name property', () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      const plugin = {
        // No name property!
        onGet: () => { throw new Error('Boom!'); }
      };
      
      const store = state({ count: 5 }, { plugins: [plugin] });
      const val = store.count;
      
      expect(val).toBe(5);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('[Lume.js] Plugin "undefined" error in onGet:'),
        expect.any(Error)
      );
      
      consoleErrorSpy.mockRestore();
    });

    it('one plugin error does not stop other plugins', () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      const workingPlugin = {
        name: 'working',
        onGet: vi.fn((key, value) => value * 2)
      };
      const brokenPlugin = {
        name: 'broken',
        onGet: () => { throw new Error('Broken!'); }
      };
      const anotherPlugin = {
        name: 'another',
        onGet: vi.fn((key, value) => value + 10)
      };
      
      const store = state({ count: 5 }, { 
        plugins: [workingPlugin, brokenPlugin, anotherPlugin] 
      });
      
      // Chain: 5 → working (10) → broken (error, stays 10) → another (20)
      expect(store.count).toBe(20);
      expect(workingPlugin.onGet).toHaveBeenCalled();
      expect(anotherPlugin.onGet).toHaveBeenCalled();
      
      consoleErrorSpy.mockRestore();
    });
  });

  describe('edge cases - weird inputs', () => {
    it('works with no plugins', () => {
      const store = state({ count: 0 }, { plugins: [] });
      expect(store.count).toBe(0);
      store.count = 5;
      expect(store.count).toBe(5);
    });

    it('works with undefined plugins option', () => {
      const store = state({ count: 0 }, { plugins: undefined });
      expect(store.count).toBe(0);
    });

    it('works with no options object', () => {
      const store = state({ count: 0 });
      expect(store.count).toBe(0);
    });

    it('handles plugin that returns undefined from onGet', () => {
      const plugin = {
        name: 'test',
        onGet: (key, value) => undefined // Explicitly return undefined
      };
      
      const store = state({ count: 5 }, { plugins: [plugin] });
      
      // Should use original value when plugin returns undefined
      expect(store.count).toBe(5);
    });

    it('handles plugin that returns null from onGet', () => {
      const plugin = {
        name: 'test',
        onGet: (key, value) => null // Return null
      };
      
      const store = state({ count: 5 }, { plugins: [plugin] });
      
      // null is a valid value, should be used
      expect(store.count).toBe(null);
    });

    it('handles plugin that returns 0 from onGet', () => {
      const plugin = {
        name: 'test',
        onGet: (key, value) => 0
      };
      
      const store = state({ count: 5 }, { plugins: [plugin] });
      
      // 0 is falsy but valid - should be used
      expect(store.count).toBe(0);
    });

    it('handles plugin that returns empty string from onGet', () => {
      const plugin = {
        name: 'test',
        onGet: (key, value) => ''
      };
      
      const store = state({ name: 'test' }, { plugins: [plugin] });
      
      // Empty string is falsy but valid
      expect(store.name).toBe('');
    });

    it('handles plugin that does not return from onSet', () => {
      const plugin = {
        name: 'test',
        onSet: (key, newValue, oldValue) => {
          // No return statement - returns undefined
        }
      };
      
      const store = state({ count: 0 }, { plugins: [plugin] });
      store.count = 10;
      
      // Should use original newValue when plugin returns undefined
      expect(store.count).toBe(10);
    });

    it('plugin can prevent updates by returning oldValue', () => {
      const plugin = {
        name: 'immutable',
        onSet: (key, newValue, oldValue) => oldValue // Always keep old value
      };
      
      const store = state({ count: 0 }, { plugins: [plugin] });
      store.count = 10;
      
      // Update should be prevented (values are same, no notification)
      expect(store.count).toBe(0);
    });

    it('handles very large plugin chain (10 plugins)', () => {
      const plugins = Array.from({ length: 10 }, (_, i) => ({
        name: `plugin${i}`,
        onGet: (key, value) => typeof value === 'number' ? value + 1 : value
      }));
      
      const store = state({ count: 0 }, { plugins });
      
      // Each plugin adds 1, so 0 + 10 = 10
      expect(store.count).toBe(10);
    });

    it('plugin hooks with no arguments work', () => {
      const plugin = {
        name: 'test',
        onInit: vi.fn(),
        onGet: vi.fn(),
        onSet: vi.fn(),
        onSubscribe: vi.fn(),
        onNotify: vi.fn()
      };
      
      const store = state({ count: 0 }, { plugins: [plugin] });
      store.count = 5;
      store.$subscribe('count', () => {});
      
      // All hooks should be called without crashing
      expect(plugin.onInit).toHaveBeenCalled();
      expect(plugin.onGet).toHaveBeenCalled();
      expect(plugin.onSet).toHaveBeenCalled();
      expect(plugin.onSubscribe).toHaveBeenCalled();
    });
  });

  describe('plugin isolation', () => {
    it('plugins are scoped to specific state instance', () => {
      const plugin1 = {
        name: 'store1-plugin',
        onGet: vi.fn((key, value) => value)
      };
      const plugin2 = {
        name: 'store2-plugin',
        onGet: vi.fn((key, value) => value)
      };
      
      const store1 = state({ count: 0 }, { plugins: [plugin1] });
      const store2 = state({ count: 0 }, { plugins: [plugin2] });
      
      store1.count;
      store2.count;
      
      expect(plugin1.onGet).toHaveBeenCalled();
      expect(plugin2.onGet).toHaveBeenCalled();
      
      // Each plugin only affects its own store
      plugin1.onGet.mockClear();
      plugin2.onGet.mockClear();
      
      store1.count;
      expect(plugin1.onGet).toHaveBeenCalled();
      expect(plugin2.onGet).not.toHaveBeenCalled();
    });

    it('plugin does not affect $subscribe meta method', () => {
      const plugin = {
        name: 'test',
        onGet: vi.fn((key, value) => 'intercepted')
      };
      
      const store = state({ count: 0 }, { plugins: [plugin] });
      
      // $subscribe should not trigger onGet
      const fn = store.$subscribe;
      expect(typeof fn).toBe('function');
      expect(plugin.onGet).not.toHaveBeenCalledWith('$subscribe', expect.anything());
    });

    it('plugin does not affect REACTIVE_MARKER', () => {
      const plugin = {
        name: 'test',
        onGet: vi.fn((key, value) => false) // Try to return false
      };
      
      const store = state({ count: 0 }, { plugins: [plugin] });
      
      // isReactive should still work (marker not intercepted)
      expect(isReactive(store)).toBe(true);
    });
  });

  describe('real-world plugin examples', () => {
    it('debug plugin logs all operations', async () => {
      const logs = [];
      const debugPlugin = {
        name: 'debug',
        onInit: () => logs.push('INIT'),
        onGet: (key, value) => {
          logs.push(`GET ${key}: ${value}`);
          return value;
        },
        onSet: (key, newValue, oldValue) => {
          logs.push(`SET ${key}: ${oldValue} → ${newValue}`);
          return newValue;
        },
        onSubscribe: (key) => logs.push(`SUBSCRIBE ${key}`),
        onNotify: (key, value) => logs.push(`NOTIFY ${key}: ${value}`)
      };
      
      const store = state({ count: 0 }, { plugins: [debugPlugin] });
      store.$subscribe('count', () => {});
      store.count;
      store.count = 5;
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
          if (key === 'age' && (newValue < 0 || newValue > 150)) {
            return oldValue; // Reject invalid age
          }
          return newValue;
        }
      };
      
      const store = state({ age: 25 }, { plugins: [validationPlugin] });
      
      store.age = 30; // Valid
      expect(store.age).toBe(30);
      
      store.age = -5; // Invalid - rejected
      expect(store.age).toBe(30);
      
      store.age = 200; // Invalid - rejected
      expect(store.age).toBe(30);
    });

    it('history plugin tracks changes', async () => {
      const history = [];
      const historyPlugin = {
        name: 'history',
        onNotify: (key, value) => {
          // Only track 'count' changes, not other keys like $subscribe
          if (key === 'count') {
            history.push({ key, value, timestamp: Date.now() });
          }
        }
      };
      
      const store = state({ count: 0 }, { plugins: [historyPlugin] });
      store.count = 1;
      await Promise.resolve();
      store.count = 2;
      await Promise.resolve();
      store.count = 3;
      await Promise.resolve();
      
      expect(history).toHaveLength(3);
      expect(history[0]).toMatchObject({ key: 'count', value: 1 });
      expect(history[1]).toMatchObject({ key: 'count', value: 2 });
      expect(history[2]).toMatchObject({ key: 'count', value: 3 });
    });

    it('transform plugin normalizes input', () => {
      const normalizePlugin = {
        name: 'normalize',
        onSet: (key, newValue, oldValue) => {
          if (key === 'email' && typeof newValue === 'string') {
            return newValue.toLowerCase().trim();
          }
          return newValue;
        }
      };
      
      const store = state({ email: '' }, { plugins: [normalizePlugin] });
      
      store.email = '  TEST@EXAMPLE.COM  ';
      expect(store.email).toBe('test@example.com');
    });

    it('computed plugin adds derived values', () => {
      const computedPlugin = {
        name: 'computed',
        onGet: (key, value) => {
          if (key === 'fullName') {
            // Access underlying state (this is advanced - just demonstration)
            return 'Computed Value';
          }
          return value;
        }
      };
      
      const store = state({ firstName: 'John', lastName: 'Doe' }, { 
        plugins: [computedPlugin] 
      });
      
      // Plugin intercepts non-existent property
      expect(store.fullName).toBe('Computed Value');
    });
  });
});
