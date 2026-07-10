# ariaAttr(name)

Creates a handler that sets an ARIA attribute to `"true"` or `"false"` based on a store value.

## Signature

```ts
function ariaAttr(name: string): { attr: string; apply(el: HTMLElement, val: any): void }
```

## Import

```js
import { ariaAttr } from 'lume-js/handlers';
```

## Parameters

- `name` — The ARIA attribute name, with or without the `aria-` prefix (e.g. `'pressed'` or `'aria-pressed'`).

## Returns

A handler object `{ attr: 'data-aria-<name>', apply }` for use in `bindDom`'s `handlers` option.

## Usage

```js
import { state, bindDom } from 'lume-js';
import { ariaAttr } from 'lume-js/handlers';

const store = state({ menuOpen: false, selected: true });

bindDom(document.body, store, {
  handlers: [ariaAttr('expanded'), ariaAttr('selected')]
});
```

```html
<button data-aria-expanded="menuOpen">Menu</button>
<li data-aria-selected="selected" role="option">Option A</li>
```

When `store.menuOpen` is `false`, `aria-expanded="false"` is set on the button. When truthy, `aria-expanded="true"`.

## Behavior

| Value | Effect |
|-------|--------|
| Truthy | `el.setAttribute('aria-<name>', 'true')` |
| Falsy | `el.setAttribute('aria-<name>', 'false')` |

The attribute is always present on the element — it's set to either `"true"` or `"false"`, never removed. This is correct behavior for boolean ARIA states.

## Built-in ARIA Attributes

`bindDom` has built-in handlers for the most common ARIA attributes:

| Attribute | Built-in |
|-----------|----------|
| `aria-expanded` | `data-aria-expanded` |
| `aria-hidden` | `data-aria-hidden` |

Use `ariaAttr` for ARIA state attributes not covered by the built-ins (`pressed`, `selected`, `disabled`, `checked`, `invalid`, etc.).

## ariaAttr vs stringAttr for ARIA

`ariaAttr` coerces values to `"true"`/`"false"` — use it for ARIA *boolean state* attributes.

For ARIA *string/token* attributes (e.g. `aria-live`, `aria-label`, `aria-sort`), use `stringAttr('aria-live')` instead, which passes the value through as a string.

```js
import { ariaAttr, stringAttr } from 'lume-js/handlers';

bindDom(root, store, {
  handlers: [
    ariaAttr('pressed'),          // aria-pressed="true"/"false"
    stringAttr('aria-live'),      // aria-live="polite" (string value)
    stringAttr('aria-label'),     // aria-label="Close dialog"
  ]
});
```

## Presets

The `a11yHandlers` preset includes common ARIA boolean state attributes:

```js
import { a11yHandlers } from 'lume-js/handlers';
// equivalent to: [ariaAttr('pressed'), ariaAttr('selected'), ariaAttr('disabled')]
```

## See also

- [boolAttr](boolAttr.md)
- [stringAttr](stringAttr.md)
- [htmlAttrs()](htmlAttrs.md)
- [Handlers guide](../../guides/handlers.md)
- [bindDom()](../core/bindDom.md)

---

<!-- lume:nav -->
**← Previous: [boolAttr](boolAttr.md)** | **Next: [classToggle](classToggle.md) →**
<!-- /lume:nav -->
