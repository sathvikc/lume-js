# state(initialState)

Creates a reactive state object.

## Signature

```typescript
function state<T extends object>(initialState: T): T;
```

## Parameters

- `initialState` (Object): The initial state object. Must be a plain object, not a primitive.

## Returns

- A reactive Proxy of the `initialState`.

## Description

`state()` wraps the provided object in a Proxy. It intercepts property access and assignment to enable automatic dependency tracking for `effect()` and `computed()`.

## Examples

### Basic Usage

```javascript
import { state } from 'lume-js';

const store = state({
  count: 0,
  name: 'Lume'
});

store.count++; // Triggers updates
```

### Nested State

Nested objects are **not** automatically reactive. You must wrap them in `state()` explicitly if you want them to be reactive.

```javascript
const store = state({
  user: state({ // ✅ Nested state
    name: 'Alice'
  }),
  settings: { // ❌ Plain object (not reactive)
    theme: 'dark'
  }
});
```

### Methods

Reactive state objects have a special method:

#### `$subscribe(key, callback)`

Subscribes to changes on a specific key.

- `key` (String): The property name to watch.
- `callback` (Function): Called with `(newValue)` immediately and whenever it changes.
- **Returns**: An unsubscribe function.

```javascript
const unsub = store.$subscribe('count', (val) => {
  console.log('Count changed:', val);
});

// Later
unsub();
```

---

**← Previous: [Build Tic-Tac-Toe](../../tutorials/build-tic-tac-toe.md)** | **Next: [bindDom()](bindDom.md) →**

> **Deep Dive:** Why does `state()` only accept objects? Read the [Design Decision](../../design/design-decisions.md#why-only-objects-in-state-not-primitives).
