# Lume.js

**Reactivity that follows web standards.**

Minimal reactive state management using only standard JavaScript and HTML - no custom syntax, no build step required, no framework lock-in.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Version](https://img.shields.io/badge/version-0.2.1-green.svg)](package.json)

## Why Lume.js?

- 🎯 **Standards-Only** - Uses only `data-*` attributes and standard JavaScript
- 📦 **Tiny** - <2KB gzipped
- ⚡ **Fast** - Direct DOM updates, no virtual DOM overhead  
- 🔧 **No Build Step** - Works directly in the browser
- 🎨 **No Lock-in** - Works with any library (GSAP, jQuery, D3, etc.)
- ♿ **Accessible** - HTML validators love it, screen readers work perfectly
- 🧹 **Clean API** - Cleanup functions prevent memory leaks

### vs Other Libraries

| Feature | Lume.js | Alpine.js | Vue | React |
|---------|---------|-----------|-----|-------|
| Custom Syntax | ❌ No | ✅ `x-data`, `@click` | ✅ `v-bind`, `v-model` | ✅ JSX |
| Build Step | ❌ Optional | ❌ Optional | ⚠️ Recommended | ✅ Required |
| Bundle Size | ~2KB | ~15KB | ~35KB | ~45KB |
| HTML Validation | ✅ Pass | ⚠️ Warnings | ⚠️ Warnings | ❌ JSX |
| Cleanup API | ✅ Yes | ⚠️ Limited | ✅ Yes | ✅ Yes |

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
  import { state, bindDom } from 'https://cdn.jsdelivr.net/npm/lume-js/src/index.js';
</script>
```

---

## Quick Start

**HTML:**
```html
<div>
  <p>Count: <span data-bind="count"></span></p>
  <input data-bind="name" placeholder="Enter name">
  <p>Hello, <span data-bind="name"></span>!</p>
  
  <button id="increment">+</button>
</div>
```

**JavaScript:**
```javascript
import { state, bindDom } from 'lume-js';

// Create reactive state
const store = state({
  count: 0,
  name: 'World'
});

// Bind to DOM
const cleanup = bindDom(document.body, store);

// Update state with standard JavaScript
document.getElementById('increment').addEventListener('click', () => {
  store.count++;
});

// Cleanup when done (important!)
window.addEventListener('beforeunload', () => cleanup());
```

That's it! No build step, no custom syntax, just HTML and JavaScript.

---

## Core API

### `state(object)`

Creates a reactive state object using Proxy.

```javascript
const store = state({
  count: 0,
  user: state({           // Nested state must be wrapped
    name: 'Alice',
    email: 'alice@example.com'
  })
});

// Update state
store.count++;
store.user.name = 'Bob';
```

**Features:**
- ✅ Validates input (must be plain object)
- ✅ Only triggers updates when value actually changes
- ✅ Returns cleanup function from `$subscribe`

### `bindDom(root, store)`

Binds reactive state to DOM elements with `data-bind` attributes.

```javascript
const cleanup = bindDom(document.body, store);

// Later: cleanup all bindings
cleanup();
```

**Supports:**
- ✅ Text content: `<span data-bind="count"></span>`
- ✅ Input values: `<input data-bind="name">`
- ✅ Textareas: `<textarea data-bind="bio"></textarea>`
- ✅ Selects: `<select data-bind="theme"></select>`
- ✅ Checkboxes: `<input type="checkbox" data-bind="enabled">`
- ✅ Numbers: `<input type="number" data-bind="age">`
- ✅ Radio buttons: `<input type="radio" data-bind="choice">`
- ✅ Nested paths: `<span data-bind="user.name"></span>`

**NEW in v0.3.0:**
- Returns cleanup function
- Better error messages with `[Lume.js]` prefix
- Handles edge cases (empty bindings, invalid paths)

### `$subscribe(key, callback)`

Manually subscribe to state changes. Returns unsubscribe function.

```javascript
const unsubscribe = store.$subscribe('count', (value) => {
  console.log('Count changed:', value);
  
  // Integrate with other libraries
  if (value > 10) {
    showNotification('Count is high!');
  }
});

// Cleanup
unsubscribe();
```

**NEW in v0.3.0:**
- Returns unsubscribe function (was missing in v0.2.x)
- Validates callback is a function
- Only notifies on actual value changes

---

## Examples

### Basic Counter

```javascript
const store = state({ count: 0 });
const cleanup = bindDom(document.body, store);

document.getElementById('inc').addEventListener('click', () => {
  store.count++;
});

// Cleanup on unmount
window.addEventListener('beforeunload', () => cleanup());
```

```html
<p>Count: <span data-bind="count"></span></p>
<button id="inc">Increment</button>
```

### Form Handling with Validation

```javascript
const form = state({
  email: '',
  age: 25,
  theme: 'light',
  errors: {}
});

const cleanup = bindDom(document.querySelector('form'), form);

// Validate on change
const unsubEmail = form.$subscribe('email', (value) => {
  const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  form.errors = {
    ...form.errors,
    email: isValid ? '' : 'Invalid email'
  };
});

// Cleanup
window.addEventListener('beforeunload', () => {
  cleanup();
  unsubEmail();
});
```

```html
<form>
  <input type="email" data-bind="email">
  <span data-bind="errors.email" style="color: red;"></span>
  
  <input type="number" data-bind="age">
  
  <select data-bind="theme">
    <option value="light">Light</option>
    <option value="dark">Dark</option>
  </select>
</form>
```

### Nested State

```javascript
const store = state({
  user: state({
    profile: state({
      name: 'Alice',
      bio: 'Developer'
    }),
    settings: state({
      notifications: true
    })
  })
});

const cleanup = bindDom(document.body, store);

// Subscribe to nested changes
const unsub = store.user.profile.$subscribe('name', (name) => {
  console.log('Profile name changed:', name);
});

// Cleanup
window.addEventListener('beforeunload', () => {
  cleanup();
  unsub();
});
```

```html
<input data-bind="user.profile.name">
<textarea data-bind="user.profile.bio"></textarea>
<input type="checkbox" data-bind="user.settings.notifications">
```

### Integration with GSAP

```javascript
import gsap from 'gsap';
import { state } from 'lume-js';

const ui = state({ x: 0, y: 0 });

const unsubX = ui.$subscribe('x', (value) => {
  gsap.to('.box', { x: value, duration: 0.5 });
});

// Now ui.x = 100 triggers smooth animation

// Cleanup
window.addEventListener('beforeunload', () => unsubX());
```

### Cleanup Pattern (Important!)

```javascript
const store = state({ data: [] });
const cleanup = bindDom(root, store);

const unsub1 = store.$subscribe('data', handleData);
const unsub2 = store.$subscribe('status', handleStatus);

// Cleanup when component unmounts
function destroy() {
  cleanup();      // Remove DOM bindings
  unsub1();       // Remove subscription 1
  unsub2();       // Remove subscription 2
}

// For SPA frameworks
onUnmount(destroy);

// For vanilla JS
window.addEventListener('beforeunload', destroy);
```

---

## Philosophy

### Standards-Only
- Uses only `data-*` attributes (HTML5 standard)
- Uses only standard JavaScript APIs (Proxy, addEventListener)
- No custom syntax that breaks validators
- Works with any tool/library

### No Artificial Limitations
```javascript
// ✅ Use with jQuery
$('.modal').fadeIn();
store.modalOpen = true;

// ✅ Use with GSAP
gsap.to(el, { x: store.position });

// ✅ Use with any router
router.on('/home', () => store.route = 'home');

// ✅ Mix with vanilla JS
document.addEventListener('click', () => store.clicks++);
```

**Lume.js doesn't hijack your architecture - it enhances it.**

### Progressive Enhancement

```html
<!-- Works without JavaScript (server-rendered) -->
<form action="/submit" method="POST">
  <input name="email" value="alice@example.com">
  <button type="submit">Save</button>
</form>

<script type="module">
  // Enhanced when JS loads
  import { state, bindDom } from 'lume-js';
  
  const form = state({ email: 'alice@example.com' });
  const cleanup = bindDom(document.querySelector('form'), form);
  
  // Prevent default, use AJAX
  document.querySelector('form').addEventListener('submit', async (e) => {
    e.preventDefault();
    await fetch('/submit', {
      method: 'POST',
      body: JSON.stringify({ email: form.email })
    });
  });
  
  window.addEventListener('beforeunload', () => cleanup());
</script>
```

---

## Who Should Use Lume.js?

### ✅ Perfect For:
- WordPress/Shopify theme developers
- Accessibility-focused teams (government, healthcare, education)
- Legacy codebases that can't do full rewrites
- Developers who hate learning framework-specific syntax
- Progressive enhancement advocates
- Projects requiring HTML validation
- Adding reactivity to server-rendered apps

### ⚠️ Consider Alternatives:
- **Complex SPAs** → Use React, Vue, or Svelte
- **Need routing/SSR** → Use Next.js, Nuxt, or SvelteKit
- **Prefer terse syntax** → Use Alpine.js (if custom syntax is okay)

---

## What's New in v0.3.0?

### Breaking Changes
- ✅ `subscribe` → `$subscribe` (restored from v0.1.0)
- ✅ `$subscribe` now returns unsubscribe function

### New Features
- ✅ TypeScript definitions (`index.d.ts`)
- ✅ `bindDom()` returns cleanup function
- ✅ Better error handling with `[Lume.js]` prefix
- ✅ Input validation (only plain objects)
- ✅ Only triggers on actual value changes
- ✅ Support for checkboxes, radio buttons, number inputs
- ✅ Comprehensive example in `/examples/comprehensive/`

### Bug Fixes
- ✅ Fixed memory leaks (no cleanup in v0.2.x)
- ✅ Fixed addon examples (used wrong API)
- ✅ Better path resolution with detailed errors

---

## Browser Support

- Chrome/Edge 49+
- Firefox 18+
- Safari 10+
- No IE11 (Proxy can't be polyfilled)

**Basically: Modern browsers with ES6 Proxy support.**

---

## Testing

Lume.js uses [Vitest](https://vitest.dev) with a jsdom environment. The test suite mirrors the source tree: files under `tests/core/**` map to `src/core/**`, and `tests/addons/**` map to `src/addons/**`.

```bash
# Run tests
npm test

# Watch mode
npm run test:watch

# Coverage with HTML report in ./coverage
npm run coverage
```

**Import alias:** Tests use an alias so you can import from `src/...` without relative `../../` paths.

```js
// vitest.config.js
resolve: {
  alias: {
    src: fileURLToPath(new URL('./src', import.meta.url))
  }
}
```

**Current coverage:**
- 100% statements, functions, and lines
- 100% branches (including edge-case paths)
- 37 tests covering core behavior, addons, inputs (text/checkbox/radio/number/range/select/textarea), nested state, and cleanup semantics

---

## Contributing

We welcome contributions! Please:

1. **Focus on:** Examples, documentation, bug fixes, performance
2. **Avoid:** Adding core features without discussion (keep it minimal!)
3. **Check:** Project specification for philosophy

---

## License

MIT © Sathvik C

---

## Inspiration

Lume.js is inspired by:
- **Knockout.js** - The original `data-bind` approach
- **Alpine.js** - Minimal, HTML-first philosophy
- **Go** - Simplicity and explicit design
- **The Web Platform** - Standards over abstractions

**Built for developers who want reactivity without the framework tax.**