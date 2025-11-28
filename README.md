# Lume.js

**Reactivity that follows web standards.**

Minimal reactive state management using only standard JavaScript and HTML. No custom syntax, no build step required, no framework lock-in.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Version](https://img.shields.io/badge/version-0.5.0-green.svg)](package.json)
[![Tests](https://img.shields.io/badge/tests-114%20passing-brightgreen.svg)](tests/)
[![Size](https://img.shields.io/badge/size-%3C2KB-blue.svg)](dist/)

## Why Lume.js?

| Feature | Lume.js | Alpine.js | Vue | React |
|---------|---------|-----------|-----|-------|
| Custom Syntax | ❌ No | ✅ `x-data` | ✅ `v-bind` | ✅ JSX |
| Build Step | ❌ Optional | ❌ Optional | ⚠️ Recommended | ✅ Required |
| Bundle Size | ~2KB | ~15KB | ~35KB | ~45KB |
| HTML Validation | ✅ Pass | ⚠️ Warnings | ⚠️ Warnings | ❌ JSX |

**Lume.js is essentially "Modern Knockout.js" - standards-only reactivity for 2025.**

---

## Installation

### Via npm

```bash
npm install lume-js
```

### Via CDN

```html
<script type="module">
  import { state, bindDom, effect } from 'https://cdn.jsdelivr.net/npm/lume-js/src/index.js';
</script>
```

---

## 30-Second Example

**HTML:**
```html
<div>
  <p>Count: <span data-bind="count"></span></p>
  <button id="inc">Increment</button>
</div>
```

**JavaScript:**
```javascript
import { state, bindDom } from 'lume-js';

// 1. Create state
const store = state({ count: 0 });

// 2. Bind to DOM
bindDom(document.body, store);

// 3. Update state (DOM updates automatically)
document.getElementById('inc').addEventListener('click', () => {
  store.count++;
});
```

---

## Documentation

Full documentation is available in the [docs/](docs/) directory:

- **[Getting Started](docs/getting-started/quick-start.md)**
- **[Tutorial: Build a Todo App](docs/tutorials/build-todo-app.md)**
- **[API Reference](docs/api/state.md)**
- **[Design Philosophy](docs/design/design-decisions.md)**

---

## Contributing

We welcome contributions! Please read [CONTRIBUTING.md](CONTRIBUTING.md) for details on how to submit pull requests, report issues, and setup your development environment.

## License

MIT © [Sathvik C](https://github.com/sathvikc)