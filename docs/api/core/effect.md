# effect(fn)

Runs a function immediately and re-runs it whenever any store key it reads changes.

## Signature

```ts
function effect(
  fn: () => void,
  deps?: Array<[store: object, ...keys: string[]]>
): () => void
```

Imported from `lume-js`.

## Parameters

- `fn` — The function to run reactively. Must be synchronous. Return value is ignored.

## Returns

A dispose function. Call it to stop the effect and free its subscriptions.

## How it works

`effect` sets a global tracking context, runs `fn`, then clears it. Every store `get` that fires during the run registers the current effect as a subscriber for that key. On any subsequent write to a tracked key, the effect is queued in a microtask and re-runs. Before each re-run, previous subscriptions are torn down and rebuilt from the new read set, so stale dependencies are dropped automatically.

You can also pass an explicit `deps` array of `[store, ...keys]` tuples to skip auto-tracking and subscribe to specific keys only. Explicit-deps notifications are coalesced: however many tracked keys (or stores) change in the same tick, the effect re-runs exactly once, on the next microtask.

> **→ Why support explicit deps?** [See the design decision.](../../design/design-decisions.md#why-support-explicit-dependencies-in-effect)

```js
import { state, effect } from 'lume-js';

const store = state({ count: 0, name: 'Ada' });

const stop = effect(() => {
  console.log(`Count: ${store.count}`);
  // store.name is NOT read, so it is NOT a dependency
});

store.count++;    // logs "Count: 1"
store.name = 'Z'; // nothing — name is not tracked
stop();           // effect stops
store.count++;    // nothing — disposed
```

## Conditional dependencies

Dependencies are determined by which keys are **actually read** in a given run. If a read is behind a condition, the subscription only exists while that branch is active.

```js
const store = state({ show: true, value: 42 });

effect(() => {
  if (store.show) {
    console.log(store.value); // only subscribed when show is true
  }
});
```

## Avoiding infinite loops

Writing to a store key inside an effect that reads the same key causes an infinite loop. If you need to derive a value, use [`computed`](../addons/computed.md) instead. Reading one key and writing a different key is fine:

```js
// Reads store.a, writes store.b — no loop
effect(() => {
  store.b = store.a * 2;
});

// Reads and writes store.count — infinite loop
effect(() => {
  store.count = store.count + 1;
});
```

## Cleanup

The dispose function returned by `effect()` tears down all subscriptions. Call it to stop the effect:

```js
const stop = effect(() => {
  document.title = `Count: ${store.count}`;
});

// Later:
stop(); // unsubscribes and stops re-running
```

## See also

- [watch()](../addons/watch.md) — explicit single-key subscription (no auto-tracking)
- [computed()](../addons/computed.md) — cached derived value
- [How reactivity works](../../guides/reactivity.md)

---

**← Previous: [bindDom()](bindDom.md)** | **Next: [batch()](batch.md) →**
