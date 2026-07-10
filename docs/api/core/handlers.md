# Handlers API

`bindDom()` accepts a `handlers` option — plain objects that teach it how to interpret additional `data-*` attributes. This page documents that extension contract. For the ready-to-use handlers themselves (`show`, `boolAttr`, `ariaAttr`, `classToggle`, `stringAttr`, `on`, `htmlAttrs`, presets), see the [API — Handlers](../handlers/show.md) reference pages.

## Table of Contents

- [Quick Start](#quick-start)
- [Handler Contract](#handler-contract)
- [Handler Override](#handler-override)
- [Custom Handlers](#custom-handlers)
- [Usage Patterns](#usage-patterns)

## Quick Start

```javascript
import { state, bindDom } from 'lume-js';
import { show, classToggle, stringAttr } from 'lume-js/handlers';

const store = state({ isVisible: true, isActive: false, url: '/profile' });

bindDom(document.body, store, {
  handlers: [show, classToggle('active'), stringAttr('href')]
});
```

```html
<span data-show="isVisible">Visible when truthy</span>
<div data-class-active="isActive">Toggles CSS class</div>
<a data-href="url">Profile</a>
```

## Handler Contract

A handler is any object with two properties:

```typescript
interface Handler {
  readonly attr: string;                        // e.g., 'data-show', 'data-class-active'
  apply(el: HTMLElement, val: any): void;       // Called with the reactive value
}
```

- `attr` — The `data-*` attribute name that triggers this handler.
- `apply` — Called immediately with the current value, then again whenever the state changes.

Handlers passed to `bindDom(root, store, { handlers: [...] })` can also be **arrays** of handler objects — `bindDom` auto-flattens one level, which is how factory functions like `classToggle(...names)` return multiple handlers from a single call.

## Handler Override

User-supplied handlers override built-in handlers with the same `attr`. This lets you customize default behavior:

```javascript
// Override data-hidden to use display:none instead of the hidden property
const customHidden = {
  attr: 'data-hidden',
  apply(el, val) {
    el.style.display = val ? 'none' : '';
  }
};

bindDom(root, store, { handlers: [customHidden] });
```

Built-in handlers that can be overridden: `data-hidden`, `data-disabled`, `data-checked`, `data-required`, `data-aria-expanded`, `data-aria-hidden`.

## Custom Handlers

Any plain object matching `{ attr, apply }` works as a handler — no registration system, no framework API:

```javascript
// Tooltip handler
const tooltip = {
  attr: 'data-tooltip',
  apply(el, val) { el.title = val ?? ''; }
};

// Background color handler
const bgColor = {
  attr: 'data-bg',
  apply(el, val) { el.style.backgroundColor = val ?? ''; }
};

bindDom(root, store, { handlers: [tooltip, bgColor] });
```

```html
<span data-tooltip="helpText">Hover me</span>
<div data-bg="themeColor">Styled</div>
```

## Usage Patterns

### Minimal (built-ins only)

```javascript
// No handlers import needed — defaults are always active
bindDom(document.body, store);
```

### Cherry-pick what you need

```javascript
import { show, classToggle } from 'lume-js/handlers';
bindDom(root, store, { handlers: [show, classToggle('active')] });
```

### Everything at once

```javascript
import { htmlAttrs } from 'lume-js/handlers';

bindDom(root, store, { handlers: [htmlAttrs()] });
```

See [htmlAttrs](../handlers/htmlAttrs.md) for what's included, and when to prefer cherry-picking instead.

### Multiple `bindDom` calls with different handlers

```javascript
// Form section needs form handlers
bindDom(document.getElementById('form'), formStore, {
  handlers: formHandlers
});

// Nav section needs different handlers
bindDom(document.getElementById('nav'), navStore, {
  handlers: [show, classToggle('active')]
});
```

## See also

- [Ready-to-use handlers](../handlers/show.md) — `show`, `className`, `boolAttr`, `ariaAttr`, `classToggle`, `stringAttr`, `on`, `htmlAttrs`
- [Handlers guide](../../guides/handlers.md)
- [bindDom()](bindDom.md)

---

<!-- lume:nav -->
**← Previous: [isReactive()](../addons/isReactive.md)** | **Next: [show](../handlers/show.md) →**
<!-- /lume:nav -->
