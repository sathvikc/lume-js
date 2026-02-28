# Lume.js

**Reactivity that follows web standards.**

Minimal reactive state management using only standard JavaScript and HTML. No custom syntax, no build step required, no framework lock-in.

> **Current Release:** v1.0.0 (stable) | **Next Release:** v2.0.0-beta.1  
> Install stable: `npm install lume-js@1.0.0`  
> Install next: `npm install lume-js@next`

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Version](https://img.shields.io/badge/version-2.0.0--beta.1-orange.svg)](package.json)
[![Tests](https://img.shields.io/badge/tests-231%20passing-brightgreen.svg)](tests/)
[![Size](https://img.shields.io/badge/core-2.39KB-blue.svg)](scripts/check-size.js)

## Why Lume.js?

| Feature | Lume.js | Alpine.js | Vue | React |
|---------|---------|-----------|-----|-------|
| Custom Syntax | ❌ No | ✅ `x-data` | ✅ `v-bind` | ✅ JSX |
| Build Step | ❌ Optional | ❌ Optional | ⚠️ Recommended | ✅ Required |
| Bundle Size | ~2.4KB | ~15KB | ~35KB | ~45KB |
| HTML Validation | ✅ Pass | ⚠️ Warnings | ⚠️ Warnings | ❌ JSX |
| Extensible Handlers | ✅ | ❌ Built-in only | ❌ Built-in only | N/A |

**Lume.js is "Modern Knockout.js" — standards-only reactivity for the modern web.**

---

## Installation

### Via CDN (Recommended for simple projects)

```html
<script type="module">
  import { state, bindDom, effect } from 'https://cdn.jsdelivr.net/npm/lume-js/src/index.js';
</script>
```

### Via NPM (Recommended for bundlers)

```bash
npm install lume-js
```

```javascript
import { state, bindDom } from 'lume-js';
```

### Browser Support
Works in all modern browsers (Chrome 49+, Firefox 18+, Safari 10+, Edge 79+). **IE11 is NOT supported.**

---

## Quick Start

**HTML:**
```html
<div>
  <h1>Hello, <span data-bind="name"></span>!</h1>
  <input data-bind="name" placeholder="Enter your name">
</div>
```

**JavaScript:**
```javascript
import { state, bindDom } from 'lume-js';

const store = state({ name: 'World' });
bindDom(document.body, store);
```

That's it — two-way binding, no build step, valid HTML.

---

## Built-in Reactive Attributes

`bindDom()` supports these `data-*` attributes out of the box:

```html
<!-- Two-way binding (inputs) / one-way (text elements) -->
<input data-bind="name">
<span data-bind="name"></span>

<!-- Boolean attributes -->
<div data-hidden="isLoading">Content</div>
<button data-disabled="isSubmitting">Submit</button>
<input data-checked="isAgreed" type="checkbox">
<input data-required="fieldRequired">

<!-- ARIA attributes -->
<button data-aria-expanded="menuOpen">Menu</button>
<div data-aria-hidden="isCollapsed">Panel</div>
```

---

## Extensible Handler System

Need more reactive attributes? Import handlers or create your own — no core modification needed.

```javascript
import { state, bindDom } from 'lume-js';
import { show, classToggle, stringAttr } from 'lume-js/handlers';

const store = state({
  isVisible: true,
  isActive: false,
  profileUrl: '/user/alice'
});

bindDom(document.body, store, {
  handlers: [show, classToggle('active'), stringAttr('href')]
});
```

```html
<span data-show="isVisible">Visible when truthy</span>
<div data-class-active="isActive">Toggles 'active' class</div>
<a data-href="profileUrl">Profile</a>
```

### Available Handlers (`lume-js/handlers`)

| Handler | HTML Example | Effect |
|---------|-------------|--------|
| `show` | `data-show="key"` | Shows element when truthy (`el.hidden = !val`) |
| `boolAttr(name)` | `data-readonly="key"` | Toggles any boolean attribute |
| `ariaAttr(name)` | `data-aria-pressed="key"` | Sets ARIA attribute to "true"/"false" |
| `classToggle(...names)` | `data-class-active="key"` | Toggles CSS classes |
| `stringAttr(name)` | `data-href="key"` | Sets string attributes (removes on null) |

### Presets

```javascript
import { formHandlers, a11yHandlers } from 'lume-js/handlers';

// formHandlers: [boolAttr('readonly')]
// a11yHandlers: [ariaAttr('pressed'), ariaAttr('selected'), ariaAttr('disabled')]
```

### Custom Handlers

Any plain object with `attr` and `apply` works:

```javascript
const tooltip = {
  attr: 'data-tooltip',
  apply(el, val) { el.title = val ?? ''; }
};

bindDom(root, store, { handlers: [tooltip] });
```

---

## Addons

Import only what you need from `lume-js/addons`:

```javascript
import { computed, watch, repeat } from 'lume-js/addons';
```

- **`computed(fn)`** — Cached derived values with auto-tracking
- **`watch(store, key, fn)`** — Subscribe to state changes
- **`repeat(container, store, key, options)`** — Keyed list rendering with element reuse

> **Note:** The `repeat` addon is *experimental*. Its API may evolve in future releases.

---

## Documentation

Full documentation is available in the [docs/](docs/) directory:

- **Tutorials**
    - [Build a Todo App](docs/tutorials/build-todo-app.md)
    - [Build Tic-Tac-Toe](docs/tutorials/build-tic-tac-toe.md)
    - [Working with Arrays](docs/tutorials/working-with-arrays.md)
- **API Reference**
    - [state()](docs/api/core/state.md) — Reactive state
    - [bindDom()](docs/api/core/bindDom.md) — DOM binding
    - [effect()](docs/api/core/effect.md) — Reactive effects
    - [Handlers](docs/api/core/handlers.md) — Extensible attribute handlers
    - [Plugins](docs/api/core/plugins.md) — State extension system
    - [Addons](docs/api/addons/computed.md) — computed, watch, repeat, debug
- **Design**
    - [Design Decisions](docs/design/design-decisions.md)

---

## Contributing

We welcome contributions! Please read [CONTRIBUTING.md](CONTRIBUTING.md) for details.

## License

MIT © [Sathvik C](https://github.com/sathvikc)
