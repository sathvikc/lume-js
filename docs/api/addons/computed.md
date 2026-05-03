# computed(fn)

Creates a cached, read-only reactive value derived from store state.

## Signature

```ts
function computed<T>(fn: () => T): {
  readonly value: T;
  subscribe(callback: (value: T) => void): () => void;
  dispose(): void;
}
```

Imported from `lume-js/addons`.

## Parameters

- `fn` — A getter function. Must be synchronous. Should have no side effects.

## Returns

An object with:
- `value` — The current computed result. Re-evaluated only when dependencies change.
- `subscribe(callback)` — Subscribes to value changes. Calls `callback` immediately with the current value, then again on every subsequent change. Returns an unsubscribe function.
- `dispose()` — Stops the computation and frees subscriptions.

## Description

`computed` uses the same auto-tracking as `effect`: all store reads inside `fn` become dependencies. When any dependency changes, `fn` re-runs on the next microtask flush. The result is cached — `fn` never runs more than once per dependency change, no matter how many places read `computed.value`.

```js
import { state } from 'lume-js';
import { computed } from 'lume-js/addons';

const store = state({ price: 1.5, qty: 2 });

const total = computed(() => store.price * store.qty);

console.log(total.value); // 3

store.qty = 4;
// After microtask:
console.log(total.value); // 6
```

## Filtering lists

```js
const store = state({ todos: [...], filter: 'all' });

const visible = computed(() => {
  if (store.filter === 'active')    return store.todos.filter(t => !t.done);
  if (store.filter === 'completed') return store.todos.filter(t => t.done);
  return store.todos;
});

// Use in effects or templates:
effect(() => {
  badge.textContent = visible.value.length;
});
```

## With `repeat`

Pass a computed as the store to `repeat`, with `'value'` as the key:

```js
import { repeat } from 'lume-js/addons';

repeat(listEl, visible, 'value', {
  key: todo => todo.id,
  render: (todo, el) => { el.textContent = todo.text; }
});
```

## Cleanup

`computed` creates an internal `effect`. Call `dispose()` when the computed is no longer needed:

```js
const c = computed(() => store.x * 2);
// … later
c.dispose();
```

## See also

- [effect()](../core/effect.md)
- [watch()](watch.md)
- [Lists & repeat](../../guides/lists.md)

---

**← Previous: [watch()](watch.md)** | **Next: [repeat()](repeat.md) →**
