# Cleanup & Dispose Patterns

Every Lume API that creates subscriptions or listeners returns a cleanup function. This guide shows how to manage them efficiently, especially when swapping views or tearing down components.

## What Returns a Cleanup?

| API | Returns | What it cleans up |
|-----|---------|-----------------|
| `bindDom(root, store)` | `() => void` | All subscriptions + event delegation listener |
| `effect(fn)` | `() => void` | All tracked subscriptions |
| `store.$subscribe(key, fn)` | `() => void` | That single subscription |
| `repeat(...)` | `() => void` | DOM elements + subscriptions |
| `computed(...).dispose()` | — | Internal effect + subscriptions |

## The Array Pattern (Zero Overhead)

For simple cases, a plain array is enough:

```js
const cleanups = [];

cleanups.push(bindDom(root, store));
cleanups.push(effect(() => { ... }));
cleanups.push(store.$subscribe('key', fn));

// Dispose everything
while (cleanups.length) cleanups.pop()();
```

**Why this works:** `pop()` removes items in reverse order, so nested teardown happens safely. Zero library code, idiomatic JavaScript.

## The CleanupGroup Addon

For apps with many teardown points, `createCleanupGroup()` provides a `.dispose()` method:

```js
import { createCleanupGroup } from 'lume-js/addons';

const group = createCleanupGroup();

group.add(bindDom(root, store));
group.add(effect(() => { ... }));
group.add(store.$subscribe('key', fn));

// Later — one call disposes everything
group.dispose();
```

**Features:**
- Ignores non-function values passed to `add()`
- Safe to call `dispose()` multiple times
- One failing cleanup doesn't block the rest
- Can be reused after `dispose()`

## Re-initialization (Page / Route Swaps)

`bindDom` supports re-init naturally. Clean up the old binding, then bind to new DOM:

```js
let cleanup = bindDom(document.getElementById('app'), store);

function swapPage(newRoot, newStore) {
  cleanup();           // remove old subscriptions
  cleanup = bindDom(newRoot, newStore);
}
```

With a cleanup group:

```js
let group = createCleanupGroup();
group.add(bindDom(root, store));
group.add(effect(() => { ... }));

function swapPage(newRoot, newStore) {
  group.dispose();
  group = createCleanupGroup();
  group.add(bindDom(newRoot, newStore));
  group.add(effect(() => { ... }));
}
```

## When to Use What

| Situation | Recommendation |
|-----------|----------------|
| Single `bindDom` call | Just use the returned cleanup directly |
| A few effects + subscriptions | Array pattern is fine |
| Complex page with many teardowns | `createCleanupGroup` for ergonomics |
| Route / page swaps | Group + re-create pattern |
