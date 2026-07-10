# withPlugins API

> **Version:** 2.0.0+ **Status:** Stable

The plugin system lets you extend Lume state with custom behaviors — logging, validation, persistence, transformation, and more. Plugins intercept state operations through a small set of hooks.

Plugins are applied via `withPlugins()`, an addon wrapper. The core `state()` function has no plugin support — this keeps the core minimal and fast.

## Table of Contents

- [Quick Start](#quick-start)
- [Plugin Interface](#plugin-interface)
- [Hook Execution Order](#hook-execution-order)
- [Chain Pattern](#chain-pattern)
- [Best Practices](#best-practices)
- [Common Patterns](#common-patterns)
- [Performance](#performance)

## Quick Start

```javascript
import { state } from 'lume-js';
import { withPlugins } from 'lume-js/addons';

const debugPlugin = {
  name: 'debug',
  onGet: (key, value) => {
    console.log(`GET ${key}:`, value);
    return value;
  },
  onSet: (key, newValue, oldValue) => {
    console.log(`SET ${key}:`, oldValue, '→', newValue);
    return newValue;
  }
};

const store = withPlugins(state({ count: 0 }), [debugPlugin]);
```

## Plugin Interface

A plugin is a plain object with a `name` property and optional hook functions:

```typescript
interface Plugin {
  name: string;                                                    // Required: unique identifier
  onInit?: () => void;                                             // Called when state is created
  onGet?: (key: string, value: any) => any;                       // Intercept reads
  onSet?: (key: string, newValue: any, oldValue: any) => any;     // Intercept writes
  onSubscribe?: (key: string) => void;                             // Called when a subscriber is added
  onNotify?: (key: string, value: any) => void;                   // Before subscribers are notified
}
```

> **Plugin objects are frozen after registration.** Once `withPlugins()` returns, `Object.freeze()` has been applied to each plugin — hooks cannot be swapped afterwards, and writes to plugin properties fail silently. Mutable plugin state (a history stack, a cache) must live in a closure variable next to the plugin, not on the plugin object itself. `onInit` runs before the freeze, so one-time setup on the object is still possible there.

### Hook: `onInit()`

Called synchronously when the state object is created.

**Use cases:** initialize plugin state, set up external connections, register global handlers.

```javascript
const plugin = {
  name: 'logger',
  onInit: () => {
    console.log('State initialized at', new Date());
  }
};
```

### Hook: `onGet(key, value)`

Called when a property is accessed, before the value is returned.

**Parameters:**
- `key` — Property key being accessed.
- `value` — Current value (possibly transformed by earlier plugins in the chain).

**Returns:** Transformed value, or the original `value` to pass it through unchanged.

**Use cases:** transform values on read, log access, implement computed properties, lazy loading.

```javascript
const transformPlugin = {
  name: 'transform',
  onGet: (key, value) => {
    if (key === 'name' && typeof value === 'string') {
      return value.toUpperCase();
    }
    return value;
  }
};
```

### Hook: `onSet(key, newValue, oldValue)`

Called when a property is updated, before subscribers are notified.

**Parameters:**
- `key` — Property key being updated.
- `newValue` — New value (possibly transformed by earlier plugins).
- `oldValue` — Previous value.

**Returns:** The value to store. Return `oldValue` to reject the change.

**Use cases:** validate input, transform values on write, prevent updates, track history.

```javascript
const validationPlugin = {
  name: 'validation',
  onSet: (key, newValue, oldValue) => {
    if (key === 'age' && (newValue < 0 || newValue > 150)) {
      console.warn('Invalid age, keeping old value');
      return oldValue; // Reject change
    }
    return newValue; // Accept change
  }
};
```

### Hook: `onSubscribe(key)`

Called when a new subscriber is added to a property.

**Parameters:**
- `key` — Property key being subscribed to.

**Use cases:** track active subscriptions, lazy load data, initialize watchers.

```javascript
const trackPlugin = {
  name: 'tracker',
  onSubscribe: (key) => {
    console.log(`New subscriber for "${key}"`);
  }
};
```

### Hook: `onNotify(key, value)`

Called during microtask flush, before subscribers are notified. This is the right place for side effects.

**Parameters:**
- `key` — Property key that changed.
- `value` — New value being notified.

**Use cases:** log notifications, sync with external systems, trigger side effects.

```javascript
const syncPlugin = {
  name: 'sync',
  onNotify: (key, value) => {
    localStorage.setItem(key, JSON.stringify(value));
  }
};
```

## Hook Execution Order

### Property access (get)

```
1. Property accessed: store.count
2. onGet hooks run (all plugins, in registration order)
3. Transformed value returned to caller
```

### Property update (set)

```
1. Property set: store.count = 5
2. onSet hooks run (all plugins, in registration order)
3. Final value stored
4. Change queued for microtask
--- microtask boundary ---
5. onNotify hooks run (all plugins, in registration order)
6. Subscribers notified
7. Effects re-run
```

### Diagram

```
store.count = 5
    ↓
  onSet (plugin1)
    ↓
  onSet (plugin2)
    ↓
  value stored
    ↓
  microtask scheduled
    ↓
  --- wait for microtask ---
    ↓
  onNotify (plugin1)
    ↓
  onNotify (plugin2)
    ↓
  subscribers called
    ↓
  effects run
```

## Chain Pattern

When multiple plugins are registered, each plugin receives the output of the previous one.

### Get chain

```javascript
const plugin1 = {
  name: 'double',
  onGet: (key, value) => typeof value === 'number' ? value * 2 : value
};

const plugin2 = {
  name: 'add10',
  onGet: (key, value) => typeof value === 'number' ? value + 10 : value
};

const store = withPlugins(state({ count: 5 }), [plugin1, plugin2]);

console.log(store.count); // (5 * 2) + 10 = 20
```

### Set chain

```javascript
const plugin1 = {
  name: 'clamp',
  onSet: (key, value) => {
    if (key === 'age') return Math.max(0, Math.min(150, value));
    return value;
  }
};

const plugin2 = {
  name: 'round',
  onSet: (key, value) => {
    if (key === 'age') return Math.round(value);
    return value;
  }
};

const store = withPlugins(state({ age: 0 }), [plugin1, plugin2]);

store.age = 175.7;
console.log(store.age); // Math.round(Math.min(150, 175.7)) = 150
```

## Best Practices

### Keep plugins focused

Each plugin should do one thing well.

```javascript
// Good: Single responsibility
const validationPlugin = { name: 'validation', onSet: validateData };
const loggingPlugin    = { name: 'logging',    onGet: logAccess };

// Avoid: Mixed responsibilities in one plugin
const godPlugin = {
  name: 'everything',
  onGet: (key, value) => { /* validate + log + transform + … */ }
};
```

### Return early for non-applicable keys

```javascript
const ageValidator = {
  name: 'age-validator',
  onSet: (key, newValue, oldValue) => {
    if (key !== 'age') return newValue;
    if (newValue < 0 || newValue > 150) return oldValue;
    return newValue;
  }
};
```

### Handle errors gracefully

Lume catches errors in plugin hooks and logs them, but your plugin should handle expected errors:

```javascript
const safePlugin = {
  name: 'safe',
  onGet: (key, value) => {
    try {
      return JSON.parse(value);
    } catch (e) {
      console.warn(`Failed to parse ${key}:`, e);
      return value;
    }
  }
};
```

### Keep `onGet` pure

`onGet` runs on every property read. Side effects here (fetch calls, writes to other keys) will fire far more often than you expect. Use `onNotify` for side effects instead.

```javascript
// Good: pure transformation
const plugin = {
  name: 'format',
  onGet: (key, value) => typeof value === 'string' ? value.toUpperCase() : value
};

// Avoid: side effects in onGet
const plugin = {
  name: 'bad',
  onGet: (key, value) => {
    fetch('/api/log', { method: 'POST', body: key }); // fires on every read!
    return value;
  }
};
```

### Use `onNotify` for side effects

```javascript
const persistPlugin = {
  name: 'persist',
  onNotify: (key, value) => {
    localStorage.setItem(key, JSON.stringify(value));
  }
};
```

## Common Patterns

### Validation

```javascript
const validationPlugin = {
  name: 'validation',
  onSet: (key, newValue, oldValue) => {
    const rules = {
      email: (v) => typeof v === 'string' && v.includes('@'),
      age:   (v) => typeof v === 'number' && v >= 0 && v <= 150
    };

    if (rules[key] && !rules[key](newValue)) {
      console.error(`Validation failed for ${key}`);
      return oldValue;
    }

    return newValue;
  }
};
```

### History / Undo-Redo

```javascript
// Plugin objects are frozen after registration, so mutable plugin state
// lives in a closure variable — not on the plugin object.
const historyStack = [];

const historyPlugin = {
  name: 'history',
  onSet: (key, newValue, oldValue) => {
    historyStack.push({ key, value: oldValue });
    return newValue;
  }
};

function undo(store) {
  if (historyStack.length > 0) {
    const { key, value } = historyStack.pop();
    store[key] = value;
  }
}
```

### Persistence

```javascript
const persistPlugin = {
  name: 'persist',

  onInit: () => {
    persistPlugin.loaded = true;
  },

  onGet: (key, value) => {
    if (persistPlugin.loaded && value === undefined) {
      const stored = localStorage.getItem(key);
      return stored ? JSON.parse(stored) : value;
    }
    return value;
  },

  onNotify: (key, value) => {
    localStorage.setItem(key, JSON.stringify(value));
  }
};
```

### Transform / Normalize

```javascript
const normalizePlugin = {
  name: 'normalize',
  onSet: (key, newValue) => {
    if (key === 'email' && typeof newValue === 'string') {
      return newValue.toLowerCase().trim();
    }
    if (key === 'phone' && typeof newValue === 'string') {
      return newValue.replace(/\D/g, ''); // digits only
    }
    return newValue;
  }
};
```

## Performance

Plugin hooks add minimal overhead — typically 10–30% per operation depending on complexity. Each hook call is synchronous, and multiple plugins execute sequentially.

**Tips:**
- Filter early: return immediately for non-applicable keys.
- Keep hook logic lightweight.
- Cache computed results when needed.
- For typical apps, 1–3 plugins is plenty.

Typical overhead on a modern system (M1 Mac):

| Operation | No Plugins | 1 Plugin | 3 Plugins | 10 Plugins |
|-----------|------------|----------|-----------|------------|
| Get | 0.001 ms | 0.002 ms | 0.004 ms | 0.010 ms |
| Set | 0.002 ms | 0.003 ms | 0.006 ms | 0.015 ms |

For the vast majority of applications, plugin overhead is negligible.

## Error Handling

Plugin errors are caught and logged but do not crash the application:

```javascript
const buggyPlugin = {
  name: 'buggy',
  onGet: (key, value) => {
    throw new Error('Oops!');
  }
};

const store = withPlugins(state({ count: 0 }), [buggyPlugin]);

store.count; // Logs error, returns original value
// Console: [Lume.js] Plugin "buggy" error in onGet: Error: Oops!
```

## TypeScript Support

Full TypeScript definitions are provided:

```typescript
import { state } from 'lume-js';
import { withPlugins, Plugin } from 'lume-js/addons';

const myPlugin: Plugin = {
  name: 'example',
  onGet: (key: string, value: unknown): unknown => {
    return value;
  }
};

const store = withPlugins(state({ count: 0 }), [myPlugin]);
```

## See also

- [Design Decisions](../../design/design-decisions.md) — Why plugins work this way
- [State API](../core/state.md) — Core state documentation
- [addons/debug](./debug.md) — Built-in debug plugin using withPlugins

---

<!-- lume:nav -->
**← Previous: [createDebugPlugin() / debug](debug.md)** | **Next: [isReactive()](isReactive.md) →**
<!-- /lume:nav -->
