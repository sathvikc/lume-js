# bindDom(root, store, options?)

Scans a DOM subtree for `data-*` attributes and wires them reactively to a store.

## Signature

```ts
function bindDom(
  root: HTMLElement,
  store: object,
  options?: {
    immediate?: boolean;
    handlers?: Handler[];
  }
): () => void
```

## Parameters

- `root` — The root element to scan. All descendants are included.
- `store` — A reactive store created by `state()`.
- `options.immediate` — If `true`, binds immediately instead of waiting for `DOMContentLoaded`. Default: `false` — [see why.](../../design/design-decisions.md#why-auto-ready-binddom-by-default)
- `options.handlers` — Additional handler objects. See [Handlers](../../guides/handlers.md).

## Returns

A cleanup function. Call it to remove all bindings and event listeners created by this call.

## Built-in bindings

### `data-bind` — two-way for forms, one-way for everything else

> **→ Why one attribute?** [Why `data-bind` only, not `data-model` or `data-text`](../../design/design-decisions.md#why-data-bind-only-not-data-model-or-data-text)

| Element | Property | Event |
|---------|----------|-------|
| `<input type="text">` and friends | `value` | `input` |
| `<input type="checkbox">` | `checked` | `input` |
| `<input type="radio">` | `checked` (by value) | `input` |
| `<input type="number">` | `valueAsNumber` | `input` |
| `<input type="range">` | `valueAsNumber` | `input` |
| `<input type="date">` | `value` | `input` |
| `<textarea>` | `value` | `input` |
| `<select>` | `value` | `input` |
| Anything else | `textContent` | — (one-way) |

### Boolean attributes

| Attribute | Effect |
|-----------|--------|
| `data-hidden="key"` | `el.hidden = Boolean(val)` |
| `data-disabled="key"` | `el.disabled = Boolean(val)` |
| `data-checked="key"` | `el.checked = Boolean(val)` |
| `data-required="key"` | `el.required = Boolean(val)` |

### ARIA attributes

| Attribute | Effect |
|-----------|--------|
| `data-aria-expanded="key"` | `el.setAttribute('aria-expanded', 'true'/'false')` |
| `data-aria-hidden="key"` | `el.setAttribute('aria-hidden', 'true'/'false')` |

### Nested paths

Every binding attribute accepts a dotted path to nested state. Each object along the path must be its own `state()`:

```js
const store = state({ user: null });
bindDom(root, store);
```

```html
<span data-bind="user.name"></span>
<input data-bind="user.email">
```

- The binding follows the path, not the object that was there at bind time. Assigning `store.user = state({...})` (after `null`, or replacing a previous user) re-links the binding to the new object; the old object no longer drives the element, and typing writes to the new one.
- A `null`/`undefined` intermediate renders as empty (like a missing value) and waits quietly; this is the normal shape of data that is still loading.
- Plain objects and arrays along the path are stepped through once, without being watched, so `list.0.name` works with an array of `state()` objects and `cfg.user.name` works through a plain `cfg`. Replacing a plain step in place is not seen; replacing the reactive key above it is.
- The last key must sit on a `state()` object. A key that does not exist, a primitive in the middle of the path, or a last key on a plain object logs a `[Lume.js]` warning.

### Nested roots: `data-bind-scope`

`bindDom(root)` binds every matching element under `root`, including elements inside a region you bind separately to another store. Mark that region with `data-bind-scope` and outer `bindDom()` calls skip everything inside it:

```html
<div id="page">
  <h1 data-bind="title"></h1>
  <div id="search" data-bind-scope data-hidden="searchOff">
    <input data-bind="query">  <!-- belongs to the search store only -->
  </div>
</div>
```

```js
bindDom(document.getElementById('page'), pageStore);
bindDom(document.getElementById('search'), searchStore);
```

- The boundary covers the element's **descendants**. Its own attributes (`data-hidden="searchOff"` above) still bind to the outer store, so the page can show or hide the widget.
- It works in either call order, at any nesting depth, and keeps the outer root's delegated `input` listener from writing into the inner store.
- Without it, both roots bind the inner elements: typing into the `<input>` writes `query` into **both** stores.

## Examples

### Basic

```html
<div id="app">
  <h1 data-bind="title"></h1>
  <input data-bind="title" placeholder="Title">
  <button data-disabled="saving">Save</button>
</div>
```

```js
import { state, bindDom } from 'lume-js';

const store = state({ title: 'Hello', saving: false });
const cleanup = bindDom(document.getElementById('app'), store);
```

### With handlers

```js
import { state, bindDom } from 'lume-js';
import { show, classToggle, stringAttr } from 'lume-js/handlers';

const store = state({ visible: true, active: false, url: '/profile' });

bindDom(document.body, store, {
  handlers: [show, classToggle('active'), stringAttr('href')]
});
```

```html
<div data-show="visible">Content</div>
<li data-class-active="active">Item</li>
<a data-href="url">Profile</a>
```

### Cleanup

`bindDom()` returns a cleanup function. You **must** call it before removing or rebinding the same DOM tree.

```js
const cleanup = bindDom(root, store);

// Later — before re-binding or navigating away
cleanup();
```

**What cleanup removes:**
- Per-element reactive subscriptions (all handlers, `data-bind`)
- The global `input` event delegation listener on the root element

**What cleanup does NOT remove:**
- The DOM elements themselves
- Any state values or stores

**Memory safety:**
- Handler subscriptions are held in closures within the cleanup array. Calling `cleanup()` releases them.
- If you discard the cleanup function without calling it, subscriptions remain active until the root element is garbage-collected.
- Re-binding the same root without cleaning up first creates duplicate listeners — always call `cleanup()` before re-binding.

```js
// SPA route change — bind new page content
const cleanup = bindDom(document.getElementById('app'), store);

// On route change:
cleanup();
// ... swap DOM ...
cleanup = bindDom(document.getElementById('app'), store);
```

## Performance notes

- Uses a single event listener at `root` (event delegation) for all form inputs — 100 inputs cost 1 listener.
- Runs a single `querySelectorAll` combining all handler attribute selectors.

## See also

- [Handlers guide](../../guides/handlers.md) — writing custom handlers
- [Two-way binding guide](../../guides/two-way-binding.md) — full form control reference
- [show](../handlers/show.md), [classToggle](../handlers/classToggle.md), [stringAttr](../handlers/stringAttr.md)

---

<!-- lume:nav -->
**← Previous: [state()](state.md)** | **Next: [effect()](effect.md) →**
<!-- /lume:nav -->
