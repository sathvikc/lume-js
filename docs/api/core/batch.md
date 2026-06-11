# batch(fn)

Groups multiple state writes and flushes them together, synchronously, when the outermost `batch()` returns.

## Signature

```ts
function batch<T>(fn: () => T): T
```

Imported from `lume-js`.

## Parameters

- `fn` — A **synchronous** function performing state writes. Its return value is passed through.

## Returns

The return value of `fn`.

## Why batch?

Lume batches writes per store via microtasks. That is usually what you want — but it is *per store*. An effect that reads three stores runs three times when all three change:

```js
const a = state({ value: 1 });
const b = state({ value: 2 });
const c = state({ value: 3 });

effect(() => {
  render(a.value + b.value + c.value);
});

a.value = 10;
b.value = 20;
c.value = 30;
// → render() runs 3 times (once per store's flush)
```

Wrap the writes in `batch()` and the effect runs exactly once, synchronously, seeing all final values:

```js
import { state, effect, batch } from 'lume-js';

batch(() => {
  a.value = 10;
  b.value = 20;
  c.value = 30;
});
// → render() ran ONCE, seeing 60 — and it already ran (no await needed)
```

## Guarantees

| Behavior | Detail |
|----------|--------|
| Coalescing | Subscribers see only the **final** value of each key written in the batch |
| Cross-store dedupe | An effect depending on N mutated stores runs **once**, not N times |
| Synchronous flush | Everything has flushed by the time `batch()` returns |
| Nesting | Inner `batch()` calls are absorbed; one flush at the outermost end |
| Errors | If `fn` throws, writes made before the throw still flush, then the error propagates |
| Cascades | Writes made *by* subscribers/effects during the flush join the same batch (capped at 100 waves, then a console error) |

## Order of operations

When the outermost `batch()` ends, for each wave: every mutated store runs its `$beforeFlush` hooks and notifies its subscribers (in the order stores were first written), then the union of queued effects runs once each. Writes made during the wave start the next wave.

## Async functions are not batched

`fn` must be synchronous. Writes after an `await` happen after `batch()` already flushed and fall back to normal per-store microtask batching. Passing an async function logs a console warning:

```js
batch(async () => {
  store.a = 1;            // batched
  await fetch('/save');
  store.b = 2;            // NOT batched — normal microtask flush
});
```

## When not to use it

Single-store updates are already batched by the microtask scheduler — `batch()` adds nothing there. Reach for it when one user action mutates **multiple stores** and you want derived effects to run once, or when you need the DOM updated synchronously before the next line of code.

## See also

- [state()](state.md) — per-store microtask batching
- [effect()](effect.md) — reactive effects
- [Performance guide](../../guides/performance.md)

---

**← Previous: [effect()](effect.md)** | **Next: [Handlers API](handlers.md) →**
