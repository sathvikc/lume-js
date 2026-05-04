# state(initialValue)

Creates a reactive proxy of a plain object.

## Signature

```ts
function state<T extends object>(initialValue: T): ReactiveState<T>
```

## Parameters

- `initialValue` — A plain object. Must not be a primitive, class instance, `Map`, or `Set`.

## Returns

A `Proxy` of `initialValue` with identical shape. Reads inside an `effect` are tracked; writes notify subscribers.

## Description

`state()` wraps the object in a `Proxy` that intercepts `get` and `set`. The `get` trap returns `target[key]` directly — it does **not** auto-wrap nested objects in a new proxy. Writes are batched via `queueMicrotask` and flush on the next microtask.

```js
import { state } from 'lume-js';

const store = state({ count: 0 });

store.count;     // read — tracked inside an effect
store.count = 5; // write — notification queued via microtask
```

## Nested reactivity

Nested objects are **not** automatically reactive. The `get` trap returns the raw value — it does not wrap sub-objects in a proxy. To make a nested object reactive, wrap it in its own `state()` call:

```js
// NOT reactive — nested write is silent
const store = state({
  settings: { theme: 'dark', lang: 'en' }
});
store.settings.theme = 'light'; // subscribers NOT notified

// Reactive — settings is its own proxy
const store = state({
  settings: state({ theme: 'dark', lang: 'en' })
});
store.settings.theme = 'light'; // notifies subscribers of 'theme'
```

> **→ Why not auto-proxy nested objects?** Explicit wrapping keeps performance predictable and ownership clear — [see the design decision.](../../design/design-decisions.md#why-nested-state-must-be-explicitly-wrapped)

## What's not reactive

| Type | Supported | Notes |
|------|-----------|-------|
| Plain objects (top-level keys) | Yes | Fully reactive |
| Nested plain objects | Partial | Must be wrapped in `state()` for reactivity |
| Arrays | Partial | Replacing the array key triggers; `push`/`splice` do not |
| `Map` / `Set` | No | Use plain objects / arrays instead |
| Class instances | Partial | Proxy wraps them, but private fields bypass reactivity |
| Functions | No | Not proxied — store methods stay plain |

## See also

- [How reactivity works](../../guides/reactivity.md) — detailed explanation of the proxy internals
- [effect()](effect.md) — auto-tracked side-effects
- [watch()](../addons/watch.md) — explicit single-key watcher

---

**← Previous: [Performance](../../guides/performance.md)** | **Next: [bindDom()](bindDom.md) →**
