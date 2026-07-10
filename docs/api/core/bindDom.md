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
