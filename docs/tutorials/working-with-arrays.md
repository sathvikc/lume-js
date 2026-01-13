# Working with Arrays in Lume.js

If you are coming from Vue 2 or older frameworks, you might be used to modifying arrays directly:
```javascript
// ❌ THIS WILL NOT WORK IN LUME
store.items.push(newItem);
```

In Lume.js, **you must update arrays immutably**. This guide explains why and how.

## The Golden Rule

> **Always create a new array when you want to trigger an update.**

```javascript
// ✅ CORRECT
store.items = [...store.items, newItem];
```

## Why?

Lume.js uses **Reference Equality** (`===`) to detect changes.

1.  **Performance**: Checking `oldArray === newArray` is instant. Checking every item inside an array is slow.
2.  **Predictability**: You explicitly tell Lume "I have changed this data" by assigning a new value.
3.  **Simplicity**: Lume doesn't need to monkey-patch `Array.prototype.push` or wrap arrays in heavy Proxies.

## Common Patterns

Here is a cheat sheet for common array operations.

### Adding Items

**Don't use:** `push()`, `unshift()`

**Use:** Spread syntax `[...]`

```javascript
// Add to end (push)
store.items = [...store.items, newItem];

// Add to start (unshift)
store.items = [newItem, ...store.items];
```

### Removing Items

**Don't use:** `splice()`, `pop()`, `shift()`

**Use:** `filter()`

```javascript
// Remove by ID
store.items = store.items.filter(item => item.id !== targetId);

// Remove by Index
store.items = store.items.filter((_, index) => index !== targetIndex);

// Remove last item
store.items = store.items.slice(0, -1);
```

### Updating Items

**Don't use:** `store.items[i] = newValue`

**Use:** `map()`

```javascript
// Update item with specific ID
store.items = store.items.map(item => 
  item.id === targetId 
    ? { ...item, status: 'done' } // Create new object for the updated item
    : item                        // Keep other items as-is
);
```

### Sorting and Reordering

**Don't use:** `sort()`, `reverse()` (these mutate in place!)

**Use:** Copy then sort

```javascript
// Sort by name
store.items = [...store.items].sort((a, b) => a.name.localeCompare(b.name));

// Reverse
store.items = [...store.items].reverse();
```

## Integration with `repeat`

When using the `repeat` addon, immutable updates are essential. `repeat` compares the new array to the old one to decide what DOM elements to add, remove, or update.

```javascript
// Pattern 1: Simple (render only)
repeat(list, store, 'items', {
  key: item => item.id,
  render: (item, el) => {
    el.textContent = item.name;  // Called on every update
  }
});

// Pattern 2: Clean separation (recommended)
repeat(list, store, 'items', {
  key: item => item.id,
  create: (item, el) => { /* DOM structure once */ },
  update: (item, el) => { /* Data binding on updates */ }
});
```

If you mutate the array in place (`push`), `repeat` won't know anything happened because the array reference hasn't changed.

## Common Mistakes

### Mistake 1: Mutating inside `map`
```javascript
// ❌ WRONG: Mutating the object inside map
store.items = store.items.map(item => {
  if (item.id === 1) {
    item.done = true; // Mutates existing object!
    return item;
  }
  return item;
});

// ✅ CORRECT: Return a new object
store.items = store.items.map(item => {
  if (item.id === 1) {
    return { ...item, done: true }; // New object
  }
  return item;
});
```

### Mistake 2: Using `sort()` directly
```javascript
// ❌ WRONG: sort() mutates in place
store.items.sort(); // Returns the SAME array, no update triggered

// ✅ CORRECT: Copy then sort
store.items = [...store.items].sort(); // New array
```

## Summary

- **Read** arrays however you want.
- **Write** arrays by creating new ones.
- Use `map`, `filter`, and `[...spread]` instead of `push`, `splice`, and loops.

## Using Helper Libraries (e.g., Immer)

If you prefer writing mutable-style code, you can use libraries like [Immer](https://immerjs.github.io/immer/).

Immer takes your current state, lets you "mutate" a draft, and then produces a **new immutable state**. This works perfectly with Lume because Lume sees the new reference and triggers the update.

```javascript
import { produce } from 'immer';

// ✅ WORKS: Immer returns a new array reference
store.items = produce(store.items, draft => {
  draft.push(newItem);
  draft[0].done = true;
});
```

Any library that follows the **Immutable Update Pattern** (Redux toolkit, etc.) is compatible with Lume.js.

---

**← Previous: [Build a Todo App](../tutorials/build-todo-app.md)** | **Next: [Build Tic-Tac-Toe](../tutorials/build-tic-tac-toe.md) →**

> **Deep Dive:** Why does Lume require immutable updates? Read the [Design Decision](../design/design-decisions.md#why-no-loop-rendering-in-core-v-for-x-for).
