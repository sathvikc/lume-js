# How reactivity works

Lume's reactivity is a thin layer over JavaScript's built-in `Proxy`. This page explains exactly what happens on a read, a write, and inside an effect. You don't need to know this to use Lume, but understanding it helps when debugging unexpected behavior.

## The Proxy

`state(obj)` returns `new Proxy(obj, handlers)`. The handlers intercept two traps:

> **→ Why only objects?** `state()` only accepts plain objects, never primitives — [see the design decision.](../design/design-decisions.md#why-only-objects-in-state-not-primitives)

```js
// Simplified pseudocode of what state() does
function state(target) {
  return new Proxy(target, {
    get(obj, key) {
      track(obj, key);           // register current effect
      return obj[key];           // return raw value (no auto-nested proxy)
    },
    set(obj, key, value) {
      const prev = obj[key];
      if (Object.is(prev, value)) return true;  // no-op on identity
      obj[key] = value;
      scheduleFlush(obj, key, value);  // notify via queueMicrotask
      return true;
    }
  });
}
```

## Tracking

When an effect starts running, Lume sets a module-scoped context variable to point at that effect. On every property read, the proxy checks for an active context and registers the effect as a subscriber for that key.

```js
effect(() => {
  //        │
  //        ├─ current effect context set
  //        │
  console.log(store.a + store.b);
  //                ▲          ▲
  //                │          └─ track: register effect as listener for 'b'
  //                └─ track: register effect as listener for 'a'
  //
  //  current effect context cleared
});
```

After the function finishes, the context is cleared. Writing to a store key inside an effect does not register a new subscription — only reads do.

## Triggering

On write, Lume queues the notification with `queueMicrotask`. On the next microtask, it calls every subscriber registered for that key. DOM updates therefore happen after the current synchronous JavaScript task finishes.

> **→ Why microtasks?** Batching writes lets multiple property changes collapse into one DOM update — [see the design decision.](../design/design-decisions.md#why-microtask-batching-instead-of-synchronous-updates)

## Nested objects

Nested objects are **not** automatically reactive. The `get` trap returns `target[key]` directly without wrapping it in a new proxy. To make a nested object reactive, wrap it in its own `state()` call:

```js
// ❌ NOT reactive — nested write will NOT notify
const bad = state({ user: { name: 'Ada' } });
bad.user.name = 'Z'; // silent: no notification

// ✅ Reactive — user is its own proxy
const good = state({ user: state({ name: 'Ada' }) });
good.user.name = 'Z'; // notifies subscribers of 'name'
```

Arrays stored on the store are reactive at the top level — replacing the array key triggers subscribers. Mutations *inside* the array (such as `push`) do **not** trigger, because the proxy only watches the key on the parent object, not the contents of the value:

```js
const store = state({ todos: [] });

// ✅ Reactive — replaces the top-level key
store.todos = [...store.todos, { text: 'buy milk' }];

// ❌ NOT reactive — mutates the raw array directly
store.todos.push({ text: 'buy milk' }); // subscribers NOT notified
```

> **→ Why no auto-nested reactivity?** Explicit wrapping keeps performance predictable and ownership clear — [see the design decision.](../design/design-decisions.md#why-nested-state-must-be-explicitly-wrapped)

## What is not reactive

- **`Map` and `Set`** — not supported. Use plain arrays instead of `Set`, and plain objects instead of `Map`.
- **Class instances** with private fields — the Proxy wraps the instance, but internal `this` references may read the private backing store directly and bypass the proxy.
- **Functions stored on the store** — methods stay plain and are not proxied.

## Anti-patterns

### `$subscribe` inside an auto-tracking effect
Calling `store.$subscribe(key, fn)` inside an `effect()` that already auto-tracks that same key will cause the logic to execute twice: once for the auto-tracking re-run and once for the manual subscription.

```js
// ❌ ANTI-PATTERN — double notification
effect(() => {
  void store.count; // auto-tracks
  store.$subscribe('count', () => { ... }); // also tracks
});
```

Instead, use `watch` for single-key reactions or let the `effect` handle all tracking automatically.

## Cleanup

Both `effect` and `bindDom` return a dispose function. Call it when the associated component or UI section is removed from the page to prevent memory leaks.

```js
const stop = effect(() => { /* … */ });
stop();     // unsubscribes and stops re-running

const cleanup = bindDom(root, store);
cleanup(); // removes ALL bindings inside root
```

---

**← Previous: [Core concepts](core-concepts.md)** | **Next: [Universal core (Node, CLI, workers)](universal-core.md) →**
