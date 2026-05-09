# Choosing the right reactive primitive

Lume has three reactive primitives: `effect()`, `computed()`, and `watch()`. They overlap in capability but each has a clear sweet spot. Use this page to pick the right one quickly.

## Decision tree

```
Do you need the result in the DOM via data-bind?
  ├─ Yes, and it's derived from other state → effect() to write it back into the store
  └─ No — it lives outside the store
       ├─ Is it a derived read-only value (display, logging)? → computed()
       └─ Is it a side effect for one specific key? → watch()
```

## Quick reference

| Primitive | Where result lives | Tracks | Fires immediately |
|-----------|--------------------|--------|-------------------|
| `effect(fn)` | Back into the store, or any side effect | Auto — all reads inside fn | Yes (on first call) |
| `computed(fn)` | Outside the store (`.value`, `.subscribe`) | Auto — all reads inside fn | Yes (`.value` is available immediately) |
| `watch(store, key, fn)` | Wherever you put it | Explicit — one key only | Yes (default), or skip with `{ immediate: false }` |

## `effect()` — derived store state and side effects

Use `effect()` when the result needs to live back in the store (so the DOM can bind to it via `data-bind`) or when you need a reactive side effect that reads multiple keys.

```js
import { state, effect } from 'lume-js';

const store = state({
  firstName: 'Ada',
  lastName: 'Lovelace',
  fullName: '',        // will be derived
  isLoading: false,
  hasData: false,
  hasError: false,
  showWeather: false,  // derived from the three above
});

// Derive fullName from first + last and write it back into state
effect(() => {
  store.fullName = `${store.firstName} ${store.lastName}`;
});

// Derive visibility flag — reads three keys, writes one
effect(() => {
  store.showWeather = store.hasData && !store.isLoading && !store.hasError;
});
```

The HTML can then bind to `fullName` and `showWeather` via `data-bind` and `data-show` — no extra wiring needed.

**Avoid reading and writing the same key in one effect** — that causes an infinite loop.

## `computed()` — read-only derived values outside the store

Use `computed()` when you need a value derived from state but consumed *outside* the store — in templates rendered by another system, in logging, or in display logic that lives in JavaScript rather than the DOM.

```js
import { state } from 'lume-js';
import { computed } from 'lume-js/addons';

const store = state({ price: 100, taxRate: 0.2 });

const total = computed(() => store.price * (1 + store.taxRate));

console.log(total.value); // 120

// Subscribe to changes
total.subscribe(val => {
  document.getElementById('total').textContent = `$${val.toFixed(2)}`;
});

// Cleanup when done
total.dispose();
```

**Anti-pattern**: using `computed().subscribe()` to write back into the store is the same as `effect()` but with extra steps.

```js
// ❌ Unnecessary — use effect() instead
computed(() => store.a + store.b).subscribe(val => { store.sum = val; });

// ✅ Simpler
effect(() => { store.sum = store.a + store.b; });
```

## `watch()` — react to a single key changing

Use `watch()` for side effects tied to exactly one property: persisting to localStorage, syncing external state, firing analytics events. Because it only watches one key there is no risk of accidentally subscribing to extra reads.

```js
import { state } from 'lume-js';
import { watch } from 'lume-js/addons';

const store = state({ theme: 'light', userId: null });

// Persist theme to localStorage on every change
watch(store, 'theme', (theme) => {
  localStorage.setItem('theme', theme);
});

// Identify user in analytics — only on future changes, not initial null
watch(store, 'userId', (id) => {
  if (id) analytics.identify(id);
}, { immediate: false });

// Stop watching
const stop = watch(store, 'count', (val) => {
  if (val >= 10) stop();
});
```

### `{ immediate: false }`

By default `watch` fires immediately with the current value (same as `$subscribe`). Pass `{ immediate: false }` to skip the initial call and only react to future changes.

## `$subscribe` — low-level, when you need maximum control

`store.$subscribe(key, fn)` is the primitive under `watch`. Prefer `watch` — it validates the store and will gain future options. Use `$subscribe` directly only when writing library code or a custom addon.

## Summary

| I want to… | Use |
|------------|-----|
| Derive a store value that drives the DOM | `effect()` |
| Expose a derived value to external code | `computed()` |
| Run a side effect when one key changes | `watch()` |
| Skip the initial call | `watch(…, { immediate: false })` |
| React to multiple keys with auto-tracking | `effect()` |

---

**← Previous: [Reactivity](reactivity.md)** | **Next: [Cleanup and dispose](cleanup-and-dispose.md) →**
