# effect(callback, deps?)

Runs a function immediately and re-runs it whenever dependencies change.

## Signature

```typescript
// Auto-tracking mode (default)
function effect(callback: () => void): () => void;

// Explicit deps mode (no magic)
function effect(callback: () => void, deps: [store, key][]): () => void;
```

## Parameters

- `callback` (Function): The function to run reactively.
- `deps` (Optional Array): Explicit dependencies as `[store, 'key']` tuples.

## Returns

- A cleanup function that stops the effect.

---

## Auto-Tracking Mode (Default)

Tracks dependencies automatically by detecting which state properties are accessed.

```javascript
const store = state({ count: 0, name: 'Alice' });

const cleanup = effect(() => {
  // Accessing store.count makes it a dependency
  console.log(`The count is ${store.count}`);
});

store.count++; // ✓ Logs: "The count is 1"
store.name = 'Bob'; // ✗ Does NOT trigger (name not accessed)
```

**Best for:** UI updates, rendering logic.

---

## Explicit Deps Mode (No Magic)

You specify exactly what triggers re-runs. No auto-tracking occurs.

```javascript
const store = state({ count: 0, name: 'Alice' });

const cleanup = effect(() => {
  // Accessing store.name does NOT create a dependency
  analytics.track('count', store.count, store.name);
}, [[store, 'count']]);  // Only re-runs when count changes

store.count++; // ✓ Effect re-runs
store.name = 'Bob'; // ✗ Effect does NOT re-run
```

**Best for:** Side-effects, logging, analytics, API calls.

---

## Multiple Dependencies

```javascript
effect(() => {
  console.log(store.a, store.b);
}, [[store, 'a'], [store, 'b']]);
```

---

## Notes

- Effects run asynchronously (microtask) to batch updates.
- In explicit mode, `globalThis.__LUME_CURRENT_EFFECT__` is NOT set.
- Clean up effects when done to prevent memory leaks.

---

**← Previous: [bindDom()](bindDom.md)** | **Next: [computed()](../addons/computed.md) →**

> **Deep Dive:** [Design Decision: Why two modes?](../../design/design-decisions.md#why-support-explicit-dependencies-in-effect)

