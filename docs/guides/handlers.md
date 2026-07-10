# Handlers

`bindDom` handles `data-bind`, `data-hidden`, `data-disabled`, and a handful of other built-in attributes. For anything else — showing elements, toggling classes, setting `href` or `src`, or any custom behavior — you use a **handler**.

A handler is a plain object with two things: the attribute name it responds to, and a function that applies the reactive value to an element. That's the entire API.

## Anatomy

```js
const myHandler = {
  attr: 'data-tooltip',
  apply(el, value) {
    el.title = value ?? '';
  }
};
```

When `bindDom` scans the DOM and finds an element with `data-tooltip="someKey"`:

1. It subscribes to `store.someKey`.
2. It calls `apply(el, store.someKey)` immediately, then again on every subsequent change.

> **→ Why `data-*` attributes?** [See the design decision.](../design/design-decisions.md#why-data-attr-for-reactive-html-attributes)

## Built-in handlers

The handlers below are exported from `lume-js/handlers`. They are opt-in — import only the ones you need.

### `show` — `data-show`

Sets `el.hidden = !Boolean(val)`: hides the element (via the `hidden` attribute) when the value is falsy.

```js
import { show } from 'lume-js/handlers';
bindDom(root, store, { handlers: [show] });

// HTML:
// <div data-show="isVisible">Only when truthy</div>
```

### `classToggle(name)` — `data-class-{name}`

Toggles a CSS class based on a truthy value. Factory — returns a handler for a specific class.

```js
import { classToggle } from 'lume-js/handlers';

bindDom(root, store, {
  handlers: [classToggle('active'), classToggle('error')]
});

// HTML:
// <li data-class-active="isSelected">…</li>
// <input data-class-error="hasError">
```

### `stringAttr(name)` — `data-{name}` → `{name}`

Mirrors a reactive value to a string attribute. Perfect for `href`, `src`, `alt`, `title`. Removes the attribute when the value is `null` or `undefined`.

```js
import { stringAttr } from 'lume-js/handlers';

bindDom(root, store, {
  handlers: [stringAttr('href'), stringAttr('src')]
});

// HTML:
// <a data-href="profileUrl">Profile</a>
// <img data-src="avatarUrl" alt="Avatar">
```

### `className` — `data-classname`

Replaces the element's entire class string. Use when reactive state holds a full class string rather than toggling individual classes.

```js
import { className } from 'lume-js/handlers';

bindDom(root, store, { handlers: [className] });

// HTML:
// <div data-classname="cardClasses">Card</div>
```

### `boolAttr(name)` — `data-{name}` → boolean attribute

Toggles any HTML boolean attribute by name. Works with any attribute `toggleAttribute()` supports.

```js
import { boolAttr } from 'lume-js/handlers';

bindDom(root, store, {
  handlers: [boolAttr('readonly'), boolAttr('open')]
});

// HTML:
// <input data-readonly="isLocked">
// <details data-open="isExpanded">...</details>
```

> The built-in `data-hidden`, `data-disabled`, `data-checked`, and `data-required` use direct property assignment. `boolAttr()` uses `toggleAttribute()` — correct for all attribute names.

### `ariaAttr(name)` — `data-aria-{name}` → `"true"`/`"false"`

Sets a boolean ARIA attribute, coercing the value to the string `"true"` or `"false"`. Use `stringAttr('aria-label')` for string-valued ARIA attributes.

```js
import { ariaAttr } from 'lume-js/handlers';

bindDom(root, store, {
  handlers: [ariaAttr('pressed'), ariaAttr('selected')]
});

// HTML:
// <button data-aria-pressed="isPressed">Toggle</button>
```

### `htmlAttrs()` — batteries-included preset

Returns a flat array of handlers covering all standard HTML boolean attributes, string attributes, and ARIA attributes. Ideal for prototyping or apps that need many different `data-*` bindings without per-handler imports.

```js
import { htmlAttrs } from 'lume-js/handlers';

bindDom(document.body, store, { handlers: [htmlAttrs()] });

// Now works without additional imports:
// <input data-readonly="isLocked" data-placeholder="hint" />
// <a data-href="url" data-title="tooltip">Link</a>
// <button data-aria-pressed="active" data-aria-label="btnLabel">…</button>
// <div data-show="isVisible">…</div>
```

> **Note:** `htmlAttrs()` is a function that returns an array — use `[htmlAttrs()]` (not `htmlAttrs` directly) so `bindDom` can flatten it. For production bundles, cherry-pick individual handlers to keep the import minimal.

## Writing your own

Any behavior you can describe as "this attribute controls this element property based on a reactive value" is a handler. The three examples below cover the most common patterns.

### Example 1 — `data-disabled`

```js
const disabled = {
  attr: 'data-disabled',
  apply(el, value) {
    el.toggleAttribute('disabled', Boolean(value));
  }
};
```

### Example 2 — `data-style-color`

```js
function styleProp(prop) {
  return {
    attr: `data-style-${prop}`,
    apply(el, value) {
      el.style.setProperty(prop, value ?? '');
    }
  };
}

bindDom(root, store, {
  handlers: [styleProp('color'), styleProp('background-color')]
});
```

### Example 3 — `data-format-currency`

```js
const formatCurrency = {
  attr: 'data-format-currency',
  apply(el, value) {
    el.textContent = new Intl.NumberFormat('en-US', {
      style: 'currency', currency: 'USD'
    }).format(value ?? 0);
  }
};

// HTML:
// <span data-format-currency="price"></span>
```

## Handler ordering

Handlers are applied in the order you pass them. If two handlers share the same `attr` name, the last one wins — it replaces the earlier one. This is how you override a built-in handler: pass your replacement after the built-in in the `handlers` array.

---

<!-- lume:nav -->
**← Previous: [Choosing reactive primitives](choosing-reactive-primitives.md)** | **Next: [Two-way binding](two-way-binding.md) →**
<!-- /lume:nav -->
