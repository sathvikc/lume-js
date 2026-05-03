# Core concepts

Lume has three building blocks. Learn them once and you understand the whole library.

## 1. State

A **store** holds your app's data. Create one by passing a plain object to `state()`:

```js
import { state } from 'lume-js';

const store = state({ count: 0, name: 'World' });
```

Read and write it exactly like a normal JavaScript object:

```js
store.count;       // read
store.count = 5;   // write — Lume notifies everything watching this key
```

Lume only watches **top-level keys** of the store. If you need a nested object to be reactive too, wrap it in its own `state()` call:

```js
const store = state({
  user: state({ name: 'Ada' })
});

store.user.name = 'Grace'; // works — user is its own reactive store
```

> **→ Why not auto-proxy nested objects?** Explicit wrapping keeps performance predictable and ownership clear — [see the design decision.](../design/design-decisions.md#why-nested-state-must-be-explicitly-wrapped)

## 2. Bindings

`bindDom()` connects your store to the DOM. It scans for `data-*` attributes and keeps them live — when the store changes, the page updates automatically.

The built-in `data-bind` attribute is **two-way** on form controls and **one-way** (text content) on everything else:

```html
<span data-bind="count"></span>              <!-- displays store.count -->
<input data-bind="name">                     <!-- reads and writes store.name -->
<input type="checkbox" data-bind="agreed">   <!-- reads and writes store.agreed -->
```

For visibility, classes, attributes, and more, use **handlers** — or write your own. A handler is just a plain object with `attr` and `apply`. See [Handlers](handlers.md).

> **→ Why one `data-bind` attribute?** [Why `data-bind` only, not `data-model` or `data-text`](../design/design-decisions.md#why-data-bind-only-not-data-model-or-data-text)

## 3. Effects

An **effect** runs a function immediately and re-runs it whenever the store data it read changes. You never list dependencies — Lume tracks them automatically.

```js
import { effect } from 'lume-js';

effect(() => {
  document.title = `${store.count} unread`;
});
// Runs once now, then again every time store.count changes.
```

The `lume-js/addons` package adds two more options when you need more control:

**`watch(store, key, fn)`** — subscribe to a single key explicitly:

```js
import { watch } from 'lume-js/addons';

watch(store, 'theme', (theme) => {
  document.documentElement.dataset.theme = theme;
});
```

**`computed(fn)`** — a cached value that updates when its dependencies change:

```js
import { computed } from 'lume-js/addons';

const remaining = computed(() =>
  store.todos.filter(t => !t.done).length
);

remaining.value; // always current, only recalculates when needed
```

## How it fits together

Your store sits in the middle. Bindings and effects subscribe to it. When you change a store key, every subscriber for that key updates — and nothing else.

```
           you write store.count = 5
                      │
          ┌───────────┴───────────┐
          │                       │
    DOM bindings             effect(fn)
   (spans, inputs…)         (re-runs fn)
```

No virtual DOM, no component tree, no build step required.

> **→ Why no virtual DOM?** Direct DOM writes are faster for small-to-medium UIs and keep the library tiny — [see the design decision.](../design/design-decisions.md#why-no-virtual-dom)

---

**← Previous: [Quick start](quick-start.md)** | **Next: [How reactivity works](reactivity.md) →**
