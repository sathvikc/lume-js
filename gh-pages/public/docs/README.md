# Introduction

**Lume.js** is a minimal reactive state management library using only standard JavaScript and HTML. No custom syntax, no build step required, no framework lock-in.

## Why Lume.js?

- **Standards-Only**: Uses `data-*` attributes and standard JS.
- **Tiny**: < 2KB gzipped.
- **No Virtual DOM**: Direct DOM manipulation for maximum performance.
- **Zero Dependencies**: Just pure JavaScript.

## Quick Star

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
```javascrip
import { state, bindDom } from 'lume-js';

// 1. Create state
const store = state({ name: 'World' });

// 2. Bind to DOM
bindDom(document.body, store);
```

<!-- ## Next Steps

- Follow the [Build a Todo App](tutorials/build-todo-app.md) tutorial.
- Learn about [Reactivity](api/core/state.md).
- Explore [Guides](guides/README.md) for advanced topics. -->
