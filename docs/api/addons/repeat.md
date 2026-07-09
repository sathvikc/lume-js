# repeat(container, store, key, options)

The right tool for any list that changes. `repeat` renders a keyed list from a reactive array and reuses existing DOM nodes across updates — so adding, removing, or reordering items only touches what actually changed.

## Signature

```ts
function repeat(
  container: HTMLElement | string,
  store: object,
  key: string,
  options: {
    key: (item: any) => string | number;
    render?: (item: any, el: HTMLElement, index: number) => void;
    create?: (item: any, el: HTMLElement, index: number) => void;
    update?: (item: any, el: HTMLElement, index: number, ctx: { isFirstRender: boolean }) => void;
    template?: true | string | HTMLTemplateElement;
    element?: string | (() => HTMLElement);
    preserveFocus?: Function | null;
    preserveScroll?: Function | null;
  }
): () => void
```

Imported from `lume-js/addons`.

## Parameters

- `container` — The element (or CSS selector string) to render into.
- `store` — A reactive store or computed whose key holds the array.
- `key` — The property name of the array in `store`.
- `options.key` — **Required.** Returns a stable unique identifier per item. Used to match DOM nodes across updates.
- `options.render` — Mutates the element directly. (Return value is ignored). Called for new and updated items.
- `options.create` — Called once when a new DOM element is created. Use for DOM structure and event listeners.
- `options.update` — Called for data binding. Receives `{ isFirstRender }` so you can animate only on updates. **Skipped when the item reference and index are both unchanged from the previous render** (optimization). Use `render` instead if you always need to re-apply data regardless of reference equality.
- `options.template` — Declarative item structure from a standard `<template>` element: `true` (first `<template>` inside the container), a CSS selector, or the element itself. See [Pattern 0](#pattern-0--template-recommended-for-declarative-html).
- `options.element` — Tag name or factory for the wrapper element. Default: `'div'`. Ignored when `template` is set.
- `options.preserveFocus` — Optional strategy for preserving focus during re-renders. Default: `defaultFocusPreservation`.
- `options.preserveScroll` — Optional strategy for preserving scroll position during re-renders. Default: `defaultScrollPreservation`.

Use `render` alone for simple read-only lists. Use `create + update` for lists with event listeners — `create` runs once when the element is created, `update` runs on every data change.

> **→ Why `create` + `update` instead of a single `render`?** [See the design decision.](../../design/design-decisions.md#why-create--update-instead-of-just-render)

## Returns

A cleanup function.

## Pattern 0 — Template (recommended for declarative HTML)

The item's structure lives in your HTML as a standard `<template>` element — valid HTML, inert until cloned, no custom syntax. `data-bind` paths inside the template resolve against **each item**.

```html
<ul id="list">
  <template>
    <li>
      <strong data-bind="name"></strong>
      <span data-bind="user.city"></span>
      <em data-bind="$index"></em>
    </li>
  </template>
</ul>
```

```js
import { state } from 'lume-js';
import { repeat } from 'lume-js/addons';

const store = state({
  people: [
    { id: 1, name: 'Ada',   user: { city: 'London' } },
    { id: 2, name: 'Grace', user: { city: 'New York' } },
  ]
});

repeat('#list', store, 'people', {
  key: p => p.id,
  template: true   // the <template> inside #list
});
```

That's the whole list — no `createElement`, no `innerHTML`, no manual `textContent`.

**Binding paths** (identical value semantics to `bindDom`'s `data-bind` — inputs get `.value`/`.checked`, everything else gets `textContent`):

| Path | Resolves to |
|------|-------------|
| `data-bind="name"` | `item.name` |
| `data-bind="user.city"` | `item.user.city` |
| `data-bind="$item"` | the item itself (primitive arrays) |
| `data-bind="$index"` | the item's current index |

Bindings are **one-way snapshots**, re-applied on each list update (items are plain objects, not stores — update arrays immutably as usual). For event listeners or extra binding, add `create`/`update` on top:

```js
repeat('#list', store, 'people', {
  key: p => p.id,
  template: true,
  create: (p, el) => {
    el.querySelector('button.delete').onclick = () => {
      store.people = store.people.filter(x => x.id !== p.id);
    };
  }
});
```

The template must contain exactly **one root element**. `render` is ignored (with a warning) in template mode; `element` is ignored.

## Pattern 1 — Simple (render only)

Best for read-only lists where no event listeners are needed on items.

```js
import { state } from 'lume-js';
import { repeat } from 'lume-js/addons';

const store = state({
  todos: [
    { id: 1, text: 'Buy milk', done: false },
    { id: 2, text: 'Walk dog', done: true  },
  ]
});

repeat(document.getElementById('list'), store, 'todos', {
  key: todo => todo.id,
  element: 'li',
  render: (todo, el) => {
    el.className = todo.done ? 'done' : '';
    el.textContent = todo.text;
  }
});
```

## Pattern 2 — create + update (recommended)

Best for items with event listeners. `create` runs once per DOM element; `update` runs on every data change.

```js
repeat('#todo-list', store, 'todos', {
  key: todo => todo.id,
  element: 'li',

  create: (todo, el) => {
    el.innerHTML = `
      <input type="checkbox" class="toggle">
      <span class="text"></span>
      <button class="delete">×</button>
    `;
    el.querySelector('.toggle').onchange = () => {
      store.todos = store.todos.map(t =>
        t.id === todo.id ? { ...t, done: !t.done } : t
      );
    };
    el.querySelector('.delete').onclick = () => {
      store.todos = store.todos.filter(t => t.id !== todo.id);
    };
  },

  update: (todo, el, index, { isFirstRender }) => {
    el.querySelector('.toggle').checked = todo.done;
    el.querySelector('.text').textContent = todo.text;
    el.classList.toggle('done', todo.done);
    if (!isFirstRender) el.classList.add('updated'); // animate on change
  }
});
```

## Array operations

| Array change | DOM effect |
|--------------|------------|
| New key added (immutable replace) | Appends/inserts new row |
| Key removed (immutable replace) | Removes row |
| Reorder — same keys (immutable replace) | Moves existing nodes, `update` fires (index changed) |
| Same key, item ref changed | Only that row's `update` fires |

> **→ Why check both reference AND index to skip `update`?** [See the design decision.](../../design/design-decisions.md#why-check-both-reference-and-index-for-update-skip)

## Using with `computed`

Pass a `computed` as the store and `'value'` as the key:

```js
import { computed } from 'lume-js/addons';

const filtered = computed(() =>
  store.todos.filter(t => store.filter === 'all' || !t.done)
);

repeat(listEl, filtered, 'value', {
  key: t => t.id,
  render: (t, el) => { el.textContent = t.text; }
});
```

## Caveats

- **Keys must be unique.** Duplicate keys log a warning; both items end up sharing the same DOM element, which produces incorrect rendering.
- **Each rendered element must have exactly one root.** Wrap fragments in a `<div>` or `<li>`.

## See also

- [Lists & repeat guide](../../guides/lists.md)
- [computed()](computed.md)
- [Todo app tutorial](../../tutorials/build-todo-app.md)

---

**← Previous: [computed()](computed.md)** | **Next: [show](../handlers/show.md) →**
