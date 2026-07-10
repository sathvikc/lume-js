# Quick start

Five minutes from nothing to a working reactive app. Every line is explained.

## Step 1 — Plain HTML

Write HTML the way you always would. No custom elements, no special syntax. The only Lume-specific thing is the `data-bind` attribute — and it's a standard `data-*` attribute, so validators won't complain.

```html
<div id="app">
  <h1>Hello, <span data-bind="name"></span>!</h1>
  <input data-bind="name">
  <p>You've clicked <span data-bind="count"></span> times.</p>
  <button onclick="store.count++">Click</button>
</div>
```

## Step 2 — Create a store

```js
import { state } from 'lume-js';
const store = state({ name: 'World', count: 0 });
```

`state()` returns a **reactive proxy**. Reading a property inside an effect subscribes to it; writing a property notifies subscribers. To make a nested object reactive, wrap it in its own `state()` call.

## Step 3 — Bind to the DOM

```js
import { bindDom } from 'lume-js';
bindDom(document.getElementById('app'), store);
```

`bindDom()` walks the root element, finds every `data-bind`, and wires it up. On form controls (`<input>`, `<textarea>`, `<select>`, checkboxes, radios) the binding is two-way — user input updates the store, and store changes update the element. On everything else it sets `textContent`.

## Step 4 — Expose the store (optional)

The `onclick="store.count++"` in Step 1 needs `store` to be accessible inline. Put it on `window` to make that work:

```js
window.store = store;
```

Prefer to keep things tidy? Use `addEventListener` and keep the store in a closure. Either approach works fine.

## Step 5 — Open it in a browser

No build step needed. Open the HTML file directly. Type in the input — the heading updates live. Click the button — the counter increments. That's the complete reactive loop.

> **This is all you need for most apps.** Lists, conditionals, classes, styles, and custom attributes are opt-in additions on top of this base.

## What's next

- [Core concepts](core-concepts.md) — the three primitives (state, bindings, effects).
- [How reactivity works](reactivity.md) — under the hood.
- [Build a Todo app](../tutorials/build-todo-app.md) — applies everything so far to a real app.

---

**← Previous: [Installation](installation.md)** | **Next: [Core concepts](core-concepts.md) →**
