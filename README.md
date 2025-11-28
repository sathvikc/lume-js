# Lume.js

**Reactivity that follows web standards.**

Minimal reactive state management using only standard JavaScript and HTML - no custom syntax, no build step required, no framework lock-in.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Version](https://img.shields.io/badge/version-0.4.1-green.svg)](package.json)

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

📖 **New to the project?** Read [DESIGN_DECISIONS.md](DESIGN_DECISIONS.md) to understand our design philosophy and why certain choices were made.

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
  
  // For addons:
  import { computed, watch } from 'https://cdn.jsdelivr.net/npm/lume-js/src/addons/index.js';
</script>
```

---

## Quick Start

### Examples

Run the live examples (including the new Todo app) with Vite:

```bash
npm run dev
```

Then open the Examples index (Vite will auto-open): `http://localhost:5173/examples/`

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
import { state, bindDom, effect } from 'lume-js';

// Create reactive state
const store = state({
  count: 0,
  name: 'World'
});

// Bind to DOM (updates on state changes)
const cleanup = bindDom(document.body, store);

// Auto-update document title when name changes
const effectCleanup = effect(() => {
  document.title = `Hello, ${store.name}!`;
});

// Update state with standard JavaScript
document.getElementById('increment').addEventListener('click', () => {
  store.count++;
});

// Cleanup when done (important!)
window.addEventListener('beforeunload', () => {
  cleanup();
  effectCleanup();
});
```

That's it! No build step, no custom syntax, just HTML and JavaScript.

---

## Core API

### `state(object)`

Creates a reactive state object using Proxy with automatic dependency tracking.

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
- ✅ Automatic dependency tracking for effects
- ✅ Per-state microtask batching for performance
- ✅ Validates input (must be plain object)
- ✅ Only triggers updates when value actually changes
- ✅ Returns cleanup function from `$subscribe`
- ✅ Deduplicates effect runs per flush cycle

### `effect(fn)`

Creates an effect that automatically tracks dependencies and re-runs when they change.

```javascript
const store = state({ count: 0, name: 'Alice' });

const cleanup = effect(() => {
  // Only tracks 'count' (name is not accessed)
  console.log(`Count: ${store.count}`);
});

store.count = 5;    // Effect re-runs
store.name = 'Bob'; // Effect does NOT re-run

cleanup(); // Stop the effect
```

**Features:**
- ✅ Automatic dependency collection (tracks what you actually access)
- ✅ Dynamic dependencies (re-tracks on every execution)
- ✅ Returns cleanup function
- ✅ Prevents infinite recursion
- ✅ Integrates with per-state batching (no global scheduler)

**How it works:** Effects use `globalThis.__LUME_CURRENT_EFFECT__` to track which state properties are accessed during execution. When any tracked property changes, the effect is queued in that state's pending effects set and runs once in the next microtask.

### `bindDom(root, store, options?)`

Binds reactive state to DOM elements with `data-bind` attributes.

**Automatically waits for DOMContentLoaded** if the document is still loading, making it safe to call from anywhere (even in `<head>`).

```javascript
// Default: Auto-waits for DOM (safe anywhere)
const cleanup = bindDom(document.body, store);

// Advanced: Force immediate binding (no auto-wait)
const cleanup = bindDom(myElement, store, { immediate: true });

// Later: cleanup all bindings
cleanup();
```

**Parameters:**
- `root` (HTMLElement) - Root element to scan for `[data-bind]` attributes
- `store` (Object) - Reactive state object
- `options` (Object, optional)
  - `immediate` (Boolean) - Skip auto-wait, bind immediately. Default: `false`

**Supports:**
- ✅ Text content: `<span data-bind="count"></span>`
- ✅ Input values: `<input data-bind="name">`
- ✅ Textareas: `<textarea data-bind="bio"></textarea>`
- ✅ Selects: `<select data-bind="theme"></select>`
- ✅ Checkboxes: `<input type="checkbox" data-bind="enabled">`
- ✅ Numbers: `<input type="number" data-bind="age">`
- ✅ Radio buttons: `<input type="radio" data-bind="choice">`
- ✅ Nested paths: `<span data-bind="user.name"></span>`

**Multiple Checkboxes Pattern:**

For multiple checkboxes, use nested state instead of arrays:

```javascript
// ✅ Recommended: Nested state objects
const store = state({
  tags: state({
    javascript: true,
    python: false,
    go: true
  })
});
```

```html
<input type="checkbox" data-bind="tags.javascript"> JavaScript
<input type="checkbox" data-bind="tags.python"> Python
<input type="checkbox" data-bind="tags.go"> Go
```

Nested state is **more explicit and easier to validate** than array-based bindings. See [DESIGN_DECISIONS.md](DESIGN_DECISIONS.md#why-nested-state-for-multiple-checkboxes-instead-of-arrays) for the full rationale.

**Features:**
- ✅ Auto-waits for DOM if needed (no timing issues!)
- ✅ Returns cleanup function
- ✅ Better error messages with `[Lume.js]` prefix
- ✅ Handles edge cases (empty bindings, invalid paths)
- ✅ Two-way binding for form inputs

### `isReactive(obj)`

Checks whether a value is a reactive proxy created by `state()`.

```javascript
import { state, isReactive } from 'lume-js';

const original = { count: 1 };
const store = state(original);

isReactive(store);    // true
isReactive(original); // false
isReactive(null);     // false
```

**How it works:**
Lume.js uses an internal `Symbol` checked via the Proxy `get` trap rather than mutating the proxy or storing external WeakSet state. Accessing `obj[REACTIVE_SYMBOL]` returns `true` only for reactive proxies, and the symbol is not enumerable or visible via `Object.getOwnPropertySymbols`.

**Characteristics:**
- ✅ Zero mutation of the proxy
- ✅ Invisible to enumeration and reflection
- ✅ Fast: single symbol identity check in the `get` path
- ✅ Supports nested reactive states naturally
- ✅ Skips tracking meta `$`-prefixed methods (e.g. `$subscribe`)

**When to use:** Utility/debugging, conditional wrapping patterns like:
```javascript
function ensureReactive(val) {
  return isReactive(val) ? val : state(val);
}
```

**Why Auto-Ready?**

Works seamlessly regardless of script placement:

```html
<!-- ✅ Works in <head> -->
<script type="module">
  import { state, bindDom } from 'lume-js';
  const store = state({ count: 0 });
  bindDom(document.body, store); // Auto-waits for DOM!
</script>

<!-- ✅ Works inline in <body> -->
<body>
  <span data-bind="count"></span>
  <script type="module">
    // bindDom() waits for DOMContentLoaded automatically
  </script>
</body>

<!-- ✅ Works with defer -->
<script type="module" defer>
  // Already loaded, executes immediately
</script>
```

**When to use `immediate: true`:**

Rare scenarios where you're dynamically creating DOM or need precise control:

```javascript
// Dynamic DOM injection
const container = document.createElement('div');
container.innerHTML = '<span data-bind="count"></span>';
document.body.appendChild(container);

// Bind immediately (DOM already exists)
bindDom(container, store, { immediate: true });
```

### `$subscribe(key, callback)`

Manually subscribe to state changes. Calls callback immediately with current value, then on every change.

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

**Features:**
- ✅ Returns unsubscribe function
- ✅ Validates callback is a function
- ✅ Calls immediately with current value (not batched)
- ✅ Only notifies on actual value changes (via batching)

---

## Addons

Lume.js provides optional addons for advanced reactivity patterns. Import from `lume-js/addons`.

### `computed(fn)`

Creates a computed value that automatically updates when its dependencies change.

```javascript
import { state, effect } from 'lume-js';
import { computed } from 'lume-js/addons';

const store = state({ count: 5 });

const doubled = computed(() => store.count * 2);
console.log(doubled.value); // 10

store.count = 10;
// After microtask:
console.log(doubled.value); // 20 (auto-updated)

// Subscribe to changes
const unsub = doubled.subscribe(value => {
  console.log('Doubled:', value);
});

// Cleanup
doubled.dispose();
unsub();
```

**Features:**
- ✅ Automatic dependency tracking using `effect()`
- ✅ Cached values (only recomputes when dependencies change)
- ✅ Subscribe to changes with `.subscribe(callback)`
- ✅ Cleanup with `.dispose()`
- ✅ Error handling (sets to undefined on error)

### `watch(store, key, callback)`

Alias for `$subscribe` - observes changes to a specific state key.

```javascript
import { state } from 'lume-js';
import { watch } from 'lume-js/addons';

const store = state({ count: 0 });

const unwatch = watch(store, 'count', (value) => {
  console.log('Count is now:', value);
});

// Cleanup
unwatch();
```

**Note:** `watch()` is just a convenience wrapper around `store.$subscribe()`. Use whichever feels more natural.

---

## Choosing the Right Reactive Pattern

Lume.js provides three ways to react to state changes. Here's when to use each:

| Pattern | Use When | Pros | Cons |
|---------|----------|------|------|
| **`bindDom()`** | Syncing state ↔ DOM | Zero code, declarative HTML | DOM-only, no custom logic |
| **`$subscribe()`** | Listening to specific keys | Explicit, immediate, simple | Manual dependency tracking |
| **`effect()`** | Auto-run code on any state access | Automatic dependencies, concise | Microtask delay, can infinite loop |
| **`computed()`** | Deriving values from state | Cached, automatic recompute | Addon import, slight overhead |

**Quick Decision Tree:**

```
Need to update DOM?
├─ Yes, just sync form/text → Use bindDom()
└─ No, custom logic needed
   ├─ Watch single key? → Use $subscribe()
   ├─ Watch multiple keys dynamically? → Use effect()
   └─ Derive a value? → Use computed()
```

**Examples:**

```javascript
// 1. bindDom - Zero code DOM sync
<span data-bind="count"></span>
bindDom(document.body, store);

// 2. $subscribe - Specific key, immediate execution
store.$subscribe('count', (val) => {
  if (val > 10) showNotification('High!');
});

// 3. effect - Multiple keys, automatic tracking
effect(() => {
  document.title = `${store.user.name}: ${store.count}`;
  // Tracks both user.name and count automatically
});

// 4. computed - Derive cached value
import { computed } from 'lume-js/addons';
const total = computed(() => store.items.reduce((sum, i) => sum + i.price, 0));
console.log(total.value);
```

**Gotchas:**

- ⚠️ **effect()** runs in next microtask (~0.002ms delay). Use `$subscribe()` for immediate execution.
- ⚠️ **Don't mutate tracked state inside effect** - causes infinite loops:
  ```javascript
  // ❌ BAD - Infinite loop
  effect(() => {
    store.count++; // Writes to what it reads!
  });
  
  // ✅ GOOD - Read-only or separate keys
  effect(() => {
    store.displayCount = store.count * 2; // Different keys
  });
  ```

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

### Using Effects for Auto-Updates

```javascript
import { state, effect } from 'lume-js';

const store = state({ 
  firstName: 'Alice', 
  lastName: 'Smith' 
});

// Auto-update title when name changes
effect(() => {
  document.title = `${store.firstName} ${store.lastName}`;
});

store.firstName = 'Bob'; 
// Title automatically updates to "Bob Smith" in next microtask
```

### Computed Values

```javascript
import { state } from 'lume-js';
import { computed } from 'lume-js/addons';

const cart = state({
  items: state([
    state({ price: 10, quantity: 2 }),
    state({ price: 15, quantity: 1 })
  ])
});

const total = computed(() => {
  return cart.items.reduce((sum, item) => 
    sum + (item.price * item.quantity), 0
  );
});

console.log(total.value); // 35

cart.items[0].quantity = 3;
// After microtask:
console.log(total.value); // 45
```

### Integration with GSAP

```javascript
import gsap from 'gsap';
import { state, effect } from 'lume-js';

const ui = state({ x: 0, y: 0 });

// Use effect for automatic animation updates
effect(() => {
  gsap.to('.box', { x: ui.x, y: ui.y, duration: 0.5 });
});

// Or use $subscribe
const unsubX = ui.$subscribe('x', (value) => {
  gsap.to('.box', { x: value, duration: 0.5 });
});

// Now ui.x = 100 triggers smooth animation

// Cleanup
window.addEventListener('beforeunload', () => unsubX());
```

### Cleanup Pattern (Important!)

```javascript
import { state, effect, bindDom } from 'lume-js';
import { computed } from 'lume-js/addons';

const store = state({ data: [] });
const cleanup = bindDom(root, store);

const unsub1 = store.$subscribe('data', handleData);
const unsub2 = store.$subscribe('status', handleStatus);

const effectCleanup = effect(() => {
  console.log('Data length:', store.data.length);
});

const total = computed(() => store.data.length * 2);

// Cleanup when component unmounts
function destroy() {
  cleanup();           // Remove DOM bindings
  unsub1();            // Remove subscription 1
  unsub2();            // Remove subscription 2
  effectCleanup();     // Stop effect
  total.dispose();     // Stop computed
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

## What's New

### Core Features
- ✅ **Automatic dependency tracking** - `effect()` automatically tracks which state properties are accessed
- ✅ **Per-state batching** - Each state object maintains its own microtask flush for optimal performance
- ✅ **Effect deduplication** - Effects only run once per flush cycle, even if multiple dependencies change
- ✅ **TypeScript support** - Full type definitions in `index.d.ts`
- ✅ **Cleanup functions** - All reactive APIs return cleanup/unsubscribe functions

### Addons
- ✅ **`computed()`** - Memoized computed values with automatic dependency tracking
- ✅ **`watch()`** - Convenience alias for `$subscribe`

### API Design
- ✅ `state()` - Create reactive state with automatic tracking support
- ✅ `effect()` - Core reactivity primitive (automatic dependency collection)
- ✅ `bindDom()` - DOM binding with two-way sync for form inputs
- ✅ `$subscribe()` - Manual subscriptions (calls immediately with current value)
- ✅ All functions return cleanup/unsubscribe functions
- ✅ Better error handling with `[Lume.js]` prefix
- ✅ Input validation on all public APIs

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
- 67 tests covering core behavior, addons, inputs (text/checkbox/radio/number/range/select/textarea), nested state, reactive identity, and cleanup semantics

---

### `repeat(container, store, key, options)`

**@experimental** - API may change in future versions.

Efficiently renders lists with element reuse and automatic subscription.

```javascript
import { repeat } from 'lume-js/addons/repeat.js';

// ⚠️ IMPORTANT: Arrays must be updated immutably!
// store.items.push(newItem);       // ❌ Won't trigger update
// store.items = [...store.items, newItem]; // ✅ Triggers update

repeat('#list', store, 'items', {
  key: item => item.id,
  render: (item, el) => {
    el.textContent = item.name;
  }
});
```

**Features:**
- ✅ **Element Reuse** - Reuses DOM nodes by key (no full re-renders)
- ✅ **Focus Preservation** - Maintains active element and selection during updates
- ✅ **Scroll Preservation** - Maintains scroll position during updates
- ✅ **Automatic Subscription** - Subscribes to the array key automatically

## Contributing

We welcome contributions! Please:

1. **Focus on:** Examples, documentation, bug fixes, performance
2. **Avoid:** Adding core features without discussion (keep it minimal!)
3. **Read:** [DESIGN_DECISIONS.md](DESIGN_DECISIONS.md) to understand our philosophy and why certain choices were made
4. **Propose alternatives:** If you think a design decision should be reconsidered, open an issue with your reasoning

Before suggesting new features, check if they align with Lume's core principles: standards-only, minimal API, no build step required.

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