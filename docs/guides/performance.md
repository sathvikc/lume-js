# Performance

Lume's update model is O(subscribers) — only the effects that read a changed key re-run, nothing else. The patterns below keep that guarantee working well as your app grows.

> **→ Why no virtual DOM?** Direct DOM writes are faster for small-to-medium UIs and keep the library tiny — [see the design decision.](../design/design-decisions.md#why-no-virtual-dom)

## Use `repeat` for lists

`innerHTML` rebuilds the entire list on every change — event listeners, focus state, and scroll position are all destroyed. `repeat` keys elements by ID and only touches what changed.

```js
import { repeat } from 'lume-js/addons';

// Keyed DOM reuse — only changed rows re-render
repeat(listEl, store, 'todos', {
  key: todo => todo.id,
  render: (todo, el) => { el.textContent = todo.text; }
});

// Destroys and recreates every node on every update
effect(() => {
  listEl.innerHTML = store.todos.map(t => `<li>${t.text}</li>`).join('');
});
```

## Use `computed` for expensive derivations

`computed` caches its result and only re-evaluates when its dependencies change. If multiple effects read the same derived value, the underlying function runs once, not once per effect.

```js
import { computed } from 'lume-js/addons';

// Filters once, caches until todos changes
const remaining = computed(() => store.todos.filter(t => !t.done).length);

// Re-filters inside every effect that reads it
effect(() => {
  const count = store.todos.filter(t => !t.done).length;
  badge.textContent = count;
});
```

## Keep state flat

Lume does **not** auto-proxy nested objects — only top-level keys on a `state()` proxy trigger subscribers. Deep nesting means you must wrap each nested object in its own `state()` call for reactivity, which adds overhead and complexity.

```js
// Flat — easy to subscribe precisely
const store = state({
  userId: 1,
  userName: 'Ada',
  userEmail: 'ada@example.com',
});

// Deep — fine for nested data, avoid for hot-path state
const store = state({
  user: { profile: { contact: { email: 'ada@example.com' } } }
});
```

## Scope `bindDom` narrowly

`bindDom` scans the subtree with `querySelectorAll`. Binding a small component root is faster than binding `document.body` for a large page.

```js
// Only scans the modal subtree
bindDom(document.getElementById('modal'), store);

// Scans the entire document
bindDom(document.body, store);
```

## Event delegation is automatic

`bindDom` attaches a single `input` event listener at the root — not one per form control. One hundred inputs cost one listener. There is nothing to configure.

```js
// All 100 inputs share one listener — nothing extra to do
bindDom(formRoot, store);
```

## Cleanup when done

Every `effect` and `bindDom` call returns a dispose function. Call it when the component unmounts to prevent memory leaks.

```js
const stopEffect = effect(() => { /* … */ });
const cleanupDom = bindDom(el, store);

// When tearing down:
stopEffect();
cleanupDom();
```

---

<!-- lume:nav -->
**← Previous: [Testing](testing.md)** | **Next: [Cleanup & Dispose](cleanup-and-dispose.md) →**
<!-- /lume:nav -->
