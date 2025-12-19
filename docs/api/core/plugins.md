# Plugins API

> **Version:** 2.0.0+  
> **Status:** Stable

The plugin system allows you to extend Lume.js state with custom behaviors. Plugins can intercept and modify state operations, add logging, validation, persistence, and more.

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

const store = state(
  { count: 0 },
  { plugins: [debugPlugin] }
);
```

## Plugin Interface

A plugin is a plain object with a `name` property and optional hook functions:

```typescript
interface Plugin {
  name: string;                // Required: unique identifier
  onInit?: () => void;         // Called when state is created
  onGet?: (key: string, value: any) => any;  // Intercept get operations
  onSet?: (key: string, newValue: any, oldValue: any) => any;  // Intercept set operations
  onSubscribe?: (key: string) => void;  // Called when subscriber added
  onNotify?: (key: string, value: any) => void;  // Before subscribers notified
}
```

### Hook: `onInit()`

Called synchronously when the state object is created.

**Use cases:**
- Initialize plugin state
- Set up external connections
- Register global handlers

**Example:**
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
- `key` (string) - Property key being accessed
- `value` (any) - Current value (possibly transformed by previous plugins)

**Returns:** Transformed value or undefined to keep current value

**Use cases:**
- Transform values on read
- Log property access
- Implement computed properties
- Lazy loading

**Example:**
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
- `key` (string) - Property key being updated
- `newValue` (any) - New value (possibly transformed by previous plugins)
- `oldValue` (any) - Previous value

**Returns:** Transformed value or undefined to keep current value

**Use cases:**
- Validate input
- Transform values on write
- Prevent updates
- Track history

**Example:**
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
- `key` (string) - Property key being subscribed to

**Use cases:**
- Track active subscriptions
- Lazy load data when needed
- Initialize watchers

**Example:**
```javascript
const trackPlugin = {
  name: 'tracker',
  onSubscribe: (key) => {
    console.log(`New subscriber for "${key}"`);
  }
};
```

### Hook: `onNotify(key, value)`

Called during microtask flush, before subscribers are notified.

**Parameters:**
- `key` (string) - Property key that changed
- `value` (any) - New value being notified

**Use cases:**
- Log notifications
- Sync with external systems
- Trigger side effects

**Example:**
```javascript
const syncPlugin = {
  name: 'sync',
  onNotify: (key, value) => {
    // Sync to server, localStorage, etc.
    localStorage.setItem(key, JSON.stringify(value));
  }
};
```

## Hook Execution Order

Hooks execute in a specific order during state operations:

### Property Access (Get)

```
1. Property accessed: store.count
2. onGet hooks (all plugins, in order)
3. Value returned to caller
```

### Property Update (Set)

```
1. Property set: store.count = 5
2. onSet hooks (all plugins, in order)
3. Value stored in state
4. Change queued for microtask
5. --- Microtask boundary ---
6. onNotify hooks (all plugins, in order)
7. Subscribers notified
8. Effects run (if any)
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

When multiple plugins are registered, they form a chain where each plugin receives the output of the previous plugin.

### Get Chain

```javascript
const plugin1 = {
  name: 'double',
  onGet: (key, value) => typeof value === 'number' ? value * 2 : value
};

const plugin2 = {
  name: 'add10',
  onGet: (key, value) => typeof value === 'number' ? value + 10 : value
};

const store = state(
  { count: 5 },
  { plugins: [plugin1, plugin2] }
);

console.log(store.count); // (5 * 2) + 10 = 20
```

### Set Chain

```javascript
const plugin1 = {
  name: 'clamp',
  onSet: (key, value) => {
    if (key === 'age') {
      return Math.max(0, Math.min(150, value)); // Clamp 0-150
    }
    return value;
  }
};

const plugin2 = {
  name: 'round',
  onSet: (key, value) => {
    if (key === 'age') {
      return Math.round(value); // Round to integer
    }
    return value;
  }
};

const store = state(
  { age: 0 },
  { plugins: [plugin1, plugin2] }
);

store.age = 175.7;
console.log(store.age); // Math.round(Math.min(150, 175.7)) = 150
```

## Best Practices

### 1. Keep Plugins Focused

Each plugin should do one thing well.

```javascript
// Good: Single responsibility
const validationPlugin = { name: 'validation', onSet: validateData };
const loggingPlugin = { name: 'logging', onGet: logAccess };

// Bad: Mixed responsibilities
const godPlugin = {
  name: 'everything',
  onGet: (key, value) => { /* validate + log + transform + ... */ }
};
```

### 2. Return Early When Not Applicable

```javascript
const ageValidator = {
  name: 'age-validator',
  onSet: (key, newValue, oldValue) => {
    // Only validate age property
    if (key !== 'age') return newValue;
    
    // Validation logic
    if (newValue < 0 || newValue > 150) {
      return oldValue;
    }
    return newValue;
  }
};
```

### 3. Handle Errors Gracefully

Lume catches errors in plugin hooks and logs them, but your plugin should handle expected errors:

```javascript
const safePlugin = {
  name: 'safe',
  onGet: (key, value) => {
    try {
      return JSON.parse(value);
    } catch (e) {
      console.warn(`Failed to parse ${key}:`, e);
      return value; // Return original value
    }
  }
};
```

### 4. Avoid Side Effects in onGet

onGet runs frequently and should be pure when possible:

```javascript
// Good: Pure transformation
const plugin = {
  name: 'format',
  onGet: (key, value) => value.toUpperCase()
};

// Bad: Side effects
const plugin = {
  name: 'bad',
  onGet: (key, value) => {
    fetch('/api/log', { method: 'POST', body: key }); // Side effect!
    return value;
  }
};
```

### 5. Use onNotify for Side Effects

onNotify is designed for side effects like persistence:

```javascript
const persistPlugin = {
  name: 'persist',
  onNotify: (key, value) => {
    // Side effects are OK here
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
      age: (v) => typeof v === 'number' && v >= 0 && v <= 150
    };
    
    if (rules[key] && !rules[key](newValue)) {
      console.error(`Validation failed for ${key}`);
      return oldValue; // Reject change
    }
    
    return newValue;
  }
};
```

### History / Undo-Redo

```javascript
const historyPlugin = {
  name: 'history',
  onSet: (key, newValue, oldValue) => {
    if (!historyPlugin.stack) historyPlugin.stack = [];
    historyPlugin.stack.push({ key, value: oldValue });
    return newValue;
  }
};

// Undo function
function undo(store) {
  if (historyPlugin.stack.length > 0) {
    const { key, value } = historyPlugin.stack.pop();
    store[key] = value;
  }
}
```

### Persistence

```javascript
const persistPlugin = {
  name: 'persist',
  
  onInit: () => {
    // Load from localStorage on init
    persistPlugin.loaded = true;
  },
  
  onGet: (key, value) => {
    // Lazy load from localStorage
    if (persistPlugin.loaded && value === undefined) {
      const stored = localStorage.getItem(key);
      return stored ? JSON.parse(stored) : value;
    }
    return value;
  },
  
  onNotify: (key, value) => {
    // Save to localStorage on change
    localStorage.setItem(key, JSON.stringify(value));
  }
};
```

### Computed Properties

```javascript
const computedPlugin = {
  name: 'computed',
  onGet: (key, value) => {
    if (key === 'fullName') {
      // Access other properties to compute value
      // Note: This creates a dependency!
      const store = computedPlugin.store;
      return `${store.firstName} ${store.lastName}`;
    }
    return value;
  }
};

// Store reference for computed access
const store = state(
  { firstName: 'John', lastName: 'Doe', fullName: null },
  { plugins: [computedPlugin] }
);
computedPlugin.store = store; // Store reference
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
      return newValue.replace(/\D/g, ''); // Remove non-digits
    }
    return newValue;
  }
};
```

## Performance

### Plugin Overhead

- Plugins add minimal overhead (~10-30% depending on complexity)
- Each hook call is synchronous
- Multiple plugins execute sequentially

### Optimization Tips

1. **Filter early**: Return immediately for non-applicable keys
2. **Avoid heavy computations**: Keep hook logic lightweight
3. **Cache when possible**: Store computed results
4. **Limit plugin count**: Use 1-3 plugins for typical apps

### Benchmarks

Typical overhead on a modern system (M1 Mac):

| Operation | No Plugins | 1 Plugin | 3 Plugins | 10 Plugins |
|-----------|------------|----------|-----------|------------|
| Get | 0.001ms | 0.002ms | 0.004ms | 0.010ms |
| Set | 0.002ms | 0.003ms | 0.006ms | 0.015ms |

For 99% of applications, plugin overhead is negligible.

## Error Handling

Plugin errors are caught and logged but do not crash the application:

```javascript
const buggyPlugin = {
  name: 'buggy',
  onGet: (key, value) => {
    throw new Error('Oops!');
  }
};

const store = state({ count: 0 }, { plugins: [buggyPlugin] });

store.count; // Logs error, returns original value
// Console: [Lume.js] Plugin "buggy" error in onGet: Error: Oops!
```

## TypeScript Support

Full TypeScript definitions are provided:

```typescript
import { state, Plugin } from 'lume-js';

const myPlugin: Plugin = {
  name: 'example',
  onGet: (key: string, value: any): any => {
    return value;
  }
};

const store = state<{ count: number }>(
  { count: 0 },
  { plugins: [myPlugin] }
);
```

## See Also

- [Design Decisions](../../design/design-decisions.md) - Why plugins work this way
- [Plugin Demo Example](../../examples/plugin-demo/) - Working examples
- [State API](./state.md) - Core state documentation
