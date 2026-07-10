# classToggle

Adds or removes a CSS class on an element based on a store value. When the value is truthy, the class is added. When falsy, it's removed. The visual behavior stays entirely in your CSS.

## Attribute

`data-class-{name}="key"`

## Import

```js
import { classToggle } from 'lume-js/handlers';
```

## Usage

`classToggle` is a factory. Call it with the class name you want to control, then pass the result to `bindDom`:

```js
import { state, bindDom } from 'lume-js';
import { classToggle } from 'lume-js/handlers';

const store = state({ active: false, hasError: false, isSelected: false });

bindDom(document.body, store, {
  handlers: [
    classToggle('active'),
    classToggle('error'),
    classToggle('selected')
  ]
});
```

```html
<li data-class-active="active">Menu item</li>
<input data-class-error="hasError" data-bind="email">
<div data-class-selected="isSelected">Card</div>
```

When `store.active` is truthy, the `active` class is added. When falsy, it's removed.

## Multiple classes at once

Pass multiple class names to one call:

```js
bindDom(root, store, {
  handlers: [classToggle('loading', 'disabled')]
});
```

This registers two handlers: `data-class-loading` and `data-class-disabled`.

## Class naming

The handler strips `data-class-` from the attribute name to get the CSS class. The attribute `data-class-is-open` toggles the class `is-open`:

```html
<div data-class-is-open="menuOpen">Menu</div>
```

```js
bindDom(root, store, { handlers: [classToggle('is-open')] });
```

## Compared to `data-hidden` / `data-show`

`classToggle` is more flexible — you define the visual behavior entirely in CSS. Use it when the show/hide logic is better expressed as a class:

```css
.sidebar { width: 0; overflow: hidden; transition: width 0.2s; }
.sidebar.open { width: 260px; }
```

```html
<aside class="sidebar" data-class-open="sidebarOpen">…</aside>
```

## See also

- [show](show.md)
- [Handlers guide](../../guides/handlers.md)
- [bindDom()](../core/bindDom.md)

---

<!-- lume:nav -->
**← Previous: [ariaAttr](ariaAttr.md)** | **Next: [stringAttr](stringAttr.md) →**
<!-- /lume:nav -->
