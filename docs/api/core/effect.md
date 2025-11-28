# effect(callback)

Runs a function immediately and re-runs it whenever its dependencies change.

## Signature

```typescript
function effect(callback: () => void): () => void;
```

## Parameters

- `callback` (Function): The function to run.

## Returns

- A cleanup function that stops the effect from running again.

## Description

`effect()` tracks which reactive state properties are accessed during the execution of `callback`. If any of those properties change later, `callback` is scheduled to run again (batched in a microtask).

## Example

```javascript
const store = state({ count: 0, name: 'Alice' });

const cleanup = effect(() => {
  // Accessing store.count makes it a dependency
  console.log(`The count is ${store.count}`);
});

store.count++; // Logs: "The count is 1"
store.name = 'Bob'; // Does NOT trigger effect (name was not accessed)
```

## Notes

- Effects run asynchronously (microtask) to batch updates.
- Do not mutate state inside an effect that depends on that same state (infinite loop).

---

**← Previous: [bindDom()](bindDom.md)** | **Next: [computed()](../addons/computed.md) →**

> **Deep Dive:** Why microtask batching? Read the [Design Decision](../../design/design-decisions.md#why-microtask-batching-instead-of-synchronous-updates).
