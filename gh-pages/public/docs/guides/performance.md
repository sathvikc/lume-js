# Performance

Lume.js is fast by default, but here are some tips for large applications.

## 1. Use `repeat` for Lists

Never use `innerHTML` to render large lists. It destroys and recreates DOM elements. Use the `repeat` addon, which reuses DOM elements.

## 2. Use `computed` for Expensive Calculations

If you have a heavy calculation (like filtering a large list), wrap it in `computed()`. It will only re-calculate when dependencies change.

```javascript
// Good
const filtered = computed(() => items.filter(...));

// Bad (runs on every render if inside effect)
effect(() => {
  const filtered = items.filter(...); 
});
```

## 3. Batch Updates

Lume automatically batches updates in the same microtask.

```javascript
// Only triggers ONE update
store.count++;
store.count++;
store.count++;
```

## 4. Avoid Deeply Nested State

While supported, deeply nested state can be harder to manage. Try to keep your state flat where possible.

---

**← Previous: [Testing](testing.md)** | **[Back to Home](../../README.md)**
