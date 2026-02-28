# Introduction

**Lume.js** is a minimal reactive state management library using only standard JavaScript and HTML. No custom syntax, no build step required, no framework lock-in.

> **Current Version:** 2.0.0-beta.1 | Core: 2.39KB gzipped | 231 tests

## Why Lume.js?

- **Standards-Only**: Uses `data-*` attributes and standard JS.
- **Tiny**: ~2.4KB gzipped core, zero dependencies.
- **No Virtual DOM**: Direct DOM manipulation for maximum performance.
- **Extensible**: Composable handler system for reactive attributes.
- **Tree-shakeable**: Import only what you need (`lume-js/handlers`, `lume-js/addons`).

## Quick Start

### 1. Install

**Via CDN:**
```html
<script type="module">
  import { state, bindDom } from 'https://cdn.jsdelivr.net/npm/lume-js/src/index.js';
</script>
```

**Via NPM:**
```bash
npm install lume-js
```

### 2. Create State & Bind

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

### 3. Extend with Handlers (optional)

```javascript
import { show, classToggle } from 'lume-js/handlers';

bindDom(document.body, store, {
  handlers: [show, classToggle('active')]
});
```

## Next Steps

- Follow the [Build a Todo App](tutorials/build-todo-app.md) tutorial.
- Learn about [Reactivity](api/core/state.md).
- Explore [Guides](guides/README.md) for advanced topics.
