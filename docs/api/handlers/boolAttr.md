# boolAttr(name)

Creates a handler that toggles any HTML boolean attribute reactively.

## Signature

```ts
function boolAttr(name: string): { attr: string; apply(el: HTMLElement, val: any): void }
```

## Import

```js
import { boolAttr } from 'lume-js/handlers';
```

## Parameters

- `name` — The HTML attribute name (e.g. `'readonly'`, `'open'`, `'contenteditable'`).

## Returns

A handler object `{ attr: 'data-<name>', apply }` for use in `bindDom`'s `handlers` option.

## Usage

```js
import { state, bindDom } from 'lume-js';
import { boolAttr } from 'lume-js/handlers';

const store = state({ editable: false, panelOpen: true });

bindDom(document.body, store, {
  handlers: [boolAttr('contenteditable'), boolAttr('open')]
});
```

```html
<div data-contenteditable="editable">Click to edit</div>
<details data-open="panelOpen">
  <summary>Details</summary>
  <p>Content</p>
</details>
```

## Behavior

Uses `el.toggleAttribute(name, Boolean(val))`. A truthy value sets the attribute; a falsy value removes it.

| Value | Effect |
|-------|--------|
| Truthy | `el.setAttribute(name, '')` — attribute present |
| Falsy (`false`, `null`, `0`, `''`) | `el.removeAttribute(name)` — attribute absent |

## Built-in Boolean Attributes

`bindDom` has built-in handlers for the most common boolean attributes — you don't need `boolAttr` for these:

| Attribute | Built-in |
|-----------|----------|
| `hidden` | `data-hidden` |
| `disabled` | `data-disabled` |
| `checked` | `data-checked` |
| `required` | `data-required` |

Use `boolAttr` for any boolean attribute not covered by the built-ins (e.g. `readonly`, `open`, `contenteditable`, `multiple`, `novalidate`).

## Presets

The `formHandlers` preset includes `boolAttr('readonly')`:

```js
import { formHandlers } from 'lume-js/handlers';
// equivalent to: [boolAttr('readonly')]
```

## See also

- [ariaAttr](ariaAttr.md)
- [stringAttr](stringAttr.md)
- [htmlAttrs()](htmlAttrs.md)
- [Handlers guide](../../guides/handlers.md)
- [bindDom()](../core/bindDom.md)

---

**← Previous: [className](className.md)** | **Next: [ariaAttr](ariaAttr.md) →**
