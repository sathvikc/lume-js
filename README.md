# Lume.js

**Reactivity that follows web standards.**

Minimal reactive state management using only standard JavaScript and HTML. No custom syntax, no build step required, no framework lock-in.

> **Current Release:** v1.0.0 (stable) | **Next Release:** v2.0.0-alpha.1  
> Install stable: `npm install lume-js@1.0.0`  
> Install next: `npm install lume-js@next`

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Version](https://img.shields.io/badge/version-2.0.0--alpha.1-orange.svg)](package.json)
[![Tests](https://img.shields.io/badge/tests-148%20passing-brightgreen.svg)](tests/)
[![Size](https://img.shields.io/badge/size-%3C2KB-blue.svg)](dist/)

## Why Lume.js?


> **Note:** The `repeat` addon is *experimental* in v1.0.0. Its API may evolve in future releases as it is refined to best fit Lume.js philosophy.

| Feature | Lume.js | Alpine.js | Vue | React |
|---------|---------|-----------|-----|-------|
| Custom Syntax | ❌ No | ✅ `x-data` | ✅ `v-bind` | ✅ JSX |
| Build Step | ❌ Optional | ❌ Optional | ⚠️ Recommended | ✅ Required |
| Bundle Size | ~2KB | ~15KB | ~35KB | ~45KB |
| HTML Validation | ✅ Pass | ⚠️ Warnings | ⚠️ Warnings | ❌ JSX |

**Lume.js is essentially "Modern Knockout.js" - standards-only reactivity for 2025.**

---

## Installation

### Via CDN (Recommended for simple projects)

```html
<script type="module">
  import { state, bindDom, effect } from 'https://cdn.jsdelivr.net/npm/lume-js/src/index.js';
</script>
```

**Version Pinning:**
```html
<script type="module">
  import { state } from 'https://cdn.jsdelivr.net/npm/lume-js@1.0.0/src/index.js';
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

// 1. Create state
const store = state({ name: 'World' });

// 2. Bind to DOM
bindDom(document.body, store);
```

**What just happened?**
1.  **`state()`** created a reactive object.
2.  **`bindDom()`** scanned the document for `data-bind="name"`.
3.  It set up a two-way binding: typing in the input updates the state, and the state updates the text.

---

## Documentation

Full documentation is available in the [docs/](docs/) directory:

- **[Tutorial: Build a Todo App](docs/tutorials/build-todo-app.md)**
- **[Tutorial: Build Tic-Tac-Toe](docs/tutorials/build-tic-tac-toe.md)**
- **[Working with Arrays](docs/tutorials/working-with-arrays.md)**
- **API Reference**
    - [Core (state, bindDom, effect)](docs/api/core/state.md)
    - [Plugins (v2.0+)](docs/api/core/plugins.md)
    - [Addons (computed, repeat)](docs/api/addons/computed.md)
- **[Design Philosophy](docs/design/design-decisions.md)**

---

## Contributing

We welcome contributions! Please read [CONTRIBUTING.md](CONTRIBUTING.md) for details.

## License

MIT © [Sathvik C](https://github.com/sathvikc)
