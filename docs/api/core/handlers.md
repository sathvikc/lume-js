# Handlers API

> **Version:** 2.0.0-beta.1+  
> **Import:** `import { ... } from 'lume-js/handlers'`  
> **Size:** 0.33KB gzipped

Handlers extend `bindDom()` with additional reactive `data-*` attributes. Each handler is a plain object — no framework API, no registration system.

## Table of Contents

- [Quick Start](#quick-start)
- [Handler Contract](#handler-contract)
- [Ready-to-use Handlers](#ready-to-use-handlers)
- [Factory Functions](#factory-functions)
- [Presets](#presets)
- [Custom Handlers](#custom-handlers)
- [Handler Override](#handler-override)
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
  readonly attr: string;         // e.g., 'data-show', 'data-class-active'
  apply(el: HTMLElement, val: any): void;  // Called with reactive value
}
```

- `attr` — The `data-*` attribute name that triggers this handler
- `apply` — Called immediately with the current value, then again whenever the state changes

## Ready-to-use Handlers

### `show`

Shows element when state value is truthy (inverse of built-in `data-hidden`).

```javascript
import { show } from 'lume-js/handlers';

bindDom(root, store, { handlers: [show] });
```

```html
<span data-show="isVisible">Shown when truthy, hidden when falsy</span>
```

**Behavior:** `el.hidden = !Boolean(val)`

## Factory Functions

### `boolAttr(name)`

Creates a handler for any HTML boolean attribute. Uses `toggleAttribute()` for broad compatibility.

```javascript
import { boolAttr } from 'lume-js/handlers';

bindDom(root, store, { handlers: [boolAttr('readonly'), boolAttr('open')] });
```

```html
<input data-readonly="isReadonly">
<details data-open="isExpanded">...</details>
```

**Behavior:** `el.toggleAttribute(name, Boolean(val))`

> **Note:** Built-in handlers for `hidden`, `disabled`, `checked`, `required` use direct property assignment (`el.hidden = true`). The `boolAttr()` factory uses `toggleAttribute()` which works correctly with any attribute name regardless of camelCase property mapping.

---

### `ariaAttr(name)`

Creates a handler for a **boolean** ARIA attribute. Coerces values to `"true"` or `"false"` strings. Accepts the name with or without the `aria-` prefix.

For string-valued ARIA attrs like `aria-label`, use `stringAttr('aria-label')` instead.

```javascript
import { ariaAttr } from 'lume-js/handlers';

bindDom(root, store, { handlers: [ariaAttr('pressed'), ariaAttr('selected')] });
```

```html
<button data-aria-pressed="isPressed">Toggle</button>
<div data-aria-selected="isSelected">Item</div>
```

**Behavior:** `el.setAttribute('aria-pressed', val ? 'true' : 'false')`

> **Note:** Built-in handlers cover `aria-expanded` and `aria-hidden`. Use `ariaAttr()` for any others.

---

### `classToggle(...names)`

Creates handlers for CSS class toggling. Each name creates a separate handler. Returns an **array** (auto-flattened by `bindDom`).

```javascript
import { classToggle } from 'lume-js/handlers';

bindDom(root, store, { handlers: [classToggle('active', 'loading', 'error')] });
```

```html
<div data-class-active="isActive" data-class-loading="isLoading">
  Toggles 'active' and 'loading' classes independently
</div>
```

**Behavior:** `el.classList.toggle(name, Boolean(val))`

Does **not** affect other classes on the element — only toggles the specified class.

---

### `stringAttr(name)`

Creates a handler for any string attribute. Removes the attribute when value is `null` or `undefined`.

```javascript
import { stringAttr } from 'lume-js/handlers';

bindDom(root, store, { handlers: [stringAttr('href'), stringAttr('src'), stringAttr('title')] });
```

```html
<a data-href="profileUrl">Profile</a>
<img data-src="imageUrl">
<span data-title="tooltipText">Hover me</span>
```

**Behavior:**
- Truthy: `el.setAttribute(name, String(val))`
- `null`/`undefined`: `el.removeAttribute(name)`

## Presets

Pre-configured handler arrays for common use cases.

### `formHandlers`

Form-related handlers beyond the built-in `disabled`/`checked`/`required`:

```javascript
import { formHandlers } from 'lume-js/handlers';

bindDom(root, store, { handlers: formHandlers });
// Includes: boolAttr('readonly')
```

### `a11yHandlers`

Additional ARIA handlers beyond the built-in `aria-expanded`/`aria-hidden`:

```javascript
import { a11yHandlers } from 'lume-js/handlers';

bindDom(root, store, { handlers: a11yHandlers });
// Includes: ariaAttr('pressed'), ariaAttr('selected'), ariaAttr('disabled')
```

### Combining Presets

```javascript
import { formHandlers, a11yHandlers, show, classToggle } from 'lume-js/handlers';

bindDom(root, store, {
  handlers: [...formHandlers, ...a11yHandlers, show, classToggle('active')]
});
```

### `htmlAttrs()`

One-import preset that enables **all standard HTML attributes** as reactive handlers. Includes boolean attrs, string attrs, ARIA attrs, and the `show` handler.

```javascript
import { htmlAttrs } from 'lume-js/handlers';

bindDom(document.body, store, { handlers: [htmlAttrs()] });
```

Now use any `data-*` attribute without additional imports:

```html
<!-- Boolean attributes -->
<input data-readonly="isLocked" />
<details data-open="isExpanded">...</details>
<video data-autoplay="shouldPlay" data-controls="showControls" data-muted="isMuted" />

<!-- String attributes -->
<a data-href="url" data-title="tooltip">Link</a>
<img data-src="imageUrl" data-alt="imageDesc" />
<input data-placeholder="hintText" data-pattern="validationRegex" />
<div data-role="widgetRole" data-tabindex="tabOrder" />

<!-- ARIA attributes -->
<button data-aria-pressed="isPressed" data-aria-label="btnLabel">Toggle</button>
<div data-aria-describedby="descId" data-aria-live="liveRegion" />
<input data-aria-invalid="hasError" data-aria-required="isRequired" />

<!-- Show handler -->
<div data-show="isVisible">Shown when truthy</div>
```

**Included attributes:**

| Category | Attributes |
|----------|-----------|
| **Boolean** | `readonly`, `open`, `novalidate`, `multiple`, `autofocus`, `autoplay`, `controls`, `loop`, `muted`, `defer`, `async`, `reversed`, `selected`, `inert`, `allowfullscreen` |
| **String** | `href`, `src`, `alt`, `title`, `placeholder`, `action`, `method`, `target`, `rel`, `type`, `name`, `role`, `lang`, `tabindex`, `pattern`, `min`, `max`, `step`, `minlength`, `maxlength`, `width`, `height`, `for`, `form`, `accept`, `autocomplete`, `loading`, `decoding`, `inputmode`, `enterkeyhint`, `draggable`, `contenteditable`, `spellcheck`, `translate`, `dir`, `id`, `poster`, `preload`, `download`, `media`, `sizes`, `srcset`, `colspan`, `rowspan`, `scope`, `headers`, `wrap`, `sandbox` |
| **ARIA (boolean)** | `pressed`, `selected`, `disabled`, `checked`, `invalid`, `required`, `busy`, `modal`, `multiselectable`, `multiline`, `readonly`, `atomic` |
| **ARIA (string)** | `label`, `describedby`, `labelledby`, `controls`, `owns`, `activedescendant`, `errormessage`, `current`, `live`, `relevant`, `haspopup`, `sort`, `autocomplete`, `orientation`, `valuenow`, `valuemin`, `valuemax`, `valuetext`, `details`, `flowto`, `colcount`, `colindex`, `colspan`, `rowcount`, `rowindex`, `rowspan`, `level`, `setsize`, `posinset`, `placeholder`, `roledescription`, `keyshortcuts`, `braillelabel`, `brailleroledescription` |
| **Other** | `show` |

> **ARIA boolean vs string:** Boolean ARIA attrs (like `aria-pressed`) are coerced to `"true"`/`"false"`. String ARIA attrs (like `aria-label`) pass through the actual value, and are removed when set to `null`/`undefined`.
>
> **When to use `htmlAttrs()`:** Great for prototyping and apps that use many different attributes. For production bundles where you want minimal overhead, cherry-pick individual handlers instead.

## Custom Handlers

Any plain object matching `{ attr, apply }` works as a handler:

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

## Handler Override

User handlers override built-in handlers with the same `attr`. This lets you customize default behavior:

```javascript
// Override data-hidden to use display:none instead of hidden property
const customHidden = {
  attr: 'data-hidden',
  apply(el, val) {
    el.style.display = val ? 'none' : '';
  }
};

bindDom(root, store, { handlers: [customHidden] });
// Now data-hidden uses style.display instead of el.hidden
```

Built-in handlers that can be overridden: `data-hidden`, `data-disabled`, `data-checked`, `data-required`, `data-aria-expanded`, `data-aria-hidden`.

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

### Full form + accessibility

```javascript
import { formHandlers, a11yHandlers, show, classToggle, stringAttr } from 'lume-js/handlers';

bindDom(root, store, {
  handlers: [
    ...formHandlers,
    ...a11yHandlers,
    show,
    classToggle('active', 'loading', 'error', 'selected'),
    stringAttr('href'),
    stringAttr('src'),
    stringAttr('title')
  ]
});
```

### Everything at once

```javascript
import { htmlAttrs } from 'lume-js/handlers';

// One import to enable all standard HTML attributes
bindDom(root, store, { handlers: [htmlAttrs()] });
```

### Multiple bindDom calls with different handlers

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

---

**← Previous: [effect()](effect.md)** | **Next: [Plugins](plugins.md) →**
