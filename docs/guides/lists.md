# Lists & repeat

The `repeat` addon renders a reactive array into the DOM. Rather than rebuilding the list on every change, it keys each element by a stable ID and only touches what actually changed. This keeps long lists fast and preserves focus and input state across updates.

## Basic usage

```js
import { state } from 'lume-js';
import { repeat } from 'lume-js/addons';

const store = state({
  todos: [
    { id: 1, text: 'Buy milk', done: false },
    { id: 2, text: 'Walk dog', done: true  },
  ]
});

repeat(document.getElementById('todo-list'), store, 'todos', {
  key: (todo) => todo.id,
  element: 'li',
  render: (todo, el) => {
    el.textContent = todo.text;           // mutate el directly
    el.classList.toggle('done', todo.done);
  }
});
```

The `render` function receives `(item, el, index)` and should mutate `el` directly. It is called once when the element is first created, and again whenever that item's data changes.

## Options

| Option | Required | Notes |
|--------|----------|-------|
| `key` | ✅ | `(item) => string | number` — returns a stable unique ID per item. Use a database ID, never array index. |
| `render` | One of | `(item, el, index) => void` — simple pattern, mutates `el` for new and updated items. |
| `create` | One of | `(item, el, index) => void` — called once when an element is created. Set DOM structure and event listeners here. |
| `update` | One of | `(item, el, index, { isFirstRender }) => void` — called on every data change. Bind data here. |
| `element` | — | Tag name or factory for the wrapper element. Default: `'div'`. |

Use `render` alone for simple, read-only lists. Use `create` + `update` for lists that have interactive elements (buttons, checkboxes) — `create` runs once per DOM element so you only attach listeners once, and `update` runs on every data change to keep the display in sync.

## Updating the list

`repeat` subscribes to the array key on the store. To trigger a re-render, **replace the array** with a new reference — in-place mutations like `push` or `splice` are invisible to Lume because the array reference does not change:

> **→ Why immutable updates?** Reference-equality checks are instant and require no Array monkey-patching — [see the design decision.](../design/design-decisions.md#why-no-loop-rendering-in-core-v-for-x-for)

```js
// ❌ Mutations — NOT reactive, repeat() will not re-render
store.todos.push(newTodo);
store.todos.splice(0, 1);

// ✅ Immutable replacement — triggers repeat() to re-render
store.todos = [...store.todos, newTodo];           // append
store.todos = store.todos.filter(t => t.id !== id); // remove
store.todos = store.todos.map(t =>                  // update item
  t.id === id ? { ...t, done: true } : t
);
```

When the new array is set, `repeat` diffs by key and performs minimal DOM operations:

| Change | DOM effect |
|----------|-----------|
| New key added | New element appended/inserted |
| Key removed | Element removed |
| Same keys, reordered | Existing nodes moved, `update` fires (index changed) |
| Same key, item ref changed | `update` callback fires for that row |

## Caveats

- **Keys must be unique.** Duplicate keys log a warning and cause two items to share one DOM element, which produces incorrect rendering.
- **Each rendered item must have exactly one root element.** Wrap multi-element fragments in a `<li>` or `<div>`.

> **See it running →**
> [Todo app tutorial](../tutorials/build-todo-app.md) and [Tic-Tac-Toe tutorial](../tutorials/build-tic-tac-toe.md) both use `repeat`.

## See also

- [repeat() API reference](../api/addons/repeat.md) — full signature, create+update pattern, array operations table
- [computed()](../api/addons/computed.md) — pass a computed as the store to filter a list reactively
- [Performance](performance.md) — why `repeat` beats `innerHTML` for dynamic lists

---

**← Previous: [Two-way binding](two-way-binding.md)** | **Next: [Forms](forms.md) →**
