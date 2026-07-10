# Lume.js Documentation

**Lume.js** is a lightweight reactive state library built on standard JavaScript and HTML. Drop it into any page via a CDN `<script>` tag and get reactive bindings in minutes — no build tool, no custom syntax, no framework required.

> **Version:** 2.3.0 · **Core:** 1.46 KB gzipped (universal) / 2.66 KB gzipped (+ DOM) · **Tests:** 439 · **Dependencies:** 0

## Why Lume.js?

| | Lume.js | Vue / React / Svelte |
|--|---------|----------------------|
| Build step | None required | Required |
| Custom syntax | None — plain `data-*` attrs | Templates / JSX / `.svelte` |
| Bundle size | 1.46–2.66 KB gzipped | 40 KB+ |
| Learning curve | ~15 min | Days |
| Virtual DOM | No — direct DOM | Yes |

Lume is a good fit when you want reactive state without a full framework: dashboards, interactive documentation, progressive enhancement on server-rendered pages, and small single-page apps.

## Quick start

### CDN — no install needed

Paste this into an HTML file and open it in a browser. No npm, no bundler, no config.

```html
<!DOCTYPE html>
<html>
<body>
  <h1>Hello, <span data-bind="name"></span>!</h1>
  <input data-bind="name" placeholder="Your name">

  <script type="module">
    import { state, bindDom } from 'https://cdn.jsdelivr.net/npm/lume-js/dist/index.min.mjs';

    const store = state({ name: 'World' });
    bindDom(document.body, store);
  </script>
</body>
</html>
```

### npm

```bash
npm install lume-js
```

```js
import { state, bindDom, effect } from 'lume-js';
import { watch, computed } from 'lume-js/addons';
import { show, classToggle, stringAttr } from 'lume-js/handlers';
```

## The three ideas

The entire library is built on three primitives. Once you understand them, you understand Lume.

### 1. `state(obj)` — reactive store

```js
const store = state({ count: 0 });

store.count = 1;  // any subscribers are notified automatically
```

### 2. `bindDom(root, store)` — DOM bindings

Scans for `data-*` attributes and wires them to the store. Form controls get two-way binding; everything else gets one-way (`textContent`).

```html
<span data-bind="count"></span>       <!-- textContent = store.count -->
<input data-bind="name">               <!-- value ⇄ store.name (two-way) -->
<input type="checkbox" data-bind="on"> <!-- checked ⇄ boolean -->
<select data-bind="theme">…</select>   <!-- value ⇄ store.theme -->
```

### 3. `effect(fn)` — reactive side-effects

Runs a function immediately and re-runs it whenever the store data it read changes. Dependencies are tracked automatically — no explicit list needed.

```js
import { effect } from 'lume-js';

effect(() => {
  document.title = `${store.count} items`;  // re-runs when count changes
});
```

Need more control? `lume-js/addons` includes `watch` (subscribe to a single key) and `computed` (cached derived value):

```js
import { watch, computed } from 'lume-js/addons';

watch(store, 'theme', (theme) => {
  localStorage.setItem('theme', theme);      // fires only when theme changes
});

const total = computed(() => store.items.reduce((s, i) => s + i.price, 0));
console.log(total.value);  // cached until items changes
```

## Package exports

| Import | Contents |
|--------|----------|
| `lume-js` | `state`, `bindDom`, `effect`, `batch` |
| `lume-js/state` | `state`, `batch`, `withReadObserver` — DOM-free universal kernel (1.46 KB) |
| `lume-js/addons` | `watch`, `computed`, `repeat`, `persist`, `withPlugins`, `createDebugPlugin`, `debug`, `isReactive`, `createCleanupGroup`, `hydrateState`, `defaultFocusPreservation`, `defaultScrollPreservation` |
| `lume-js/handlers` | `show`, `boolAttr`, `ariaAttr`, `classToggle`, `stringAttr`, `on`, `formHandlers`, `a11yHandlers`, `htmlAttrs` |

## Documentation

### Getting started
- [Installation](guides/installation.md)
- [Quick start](guides/quick-start.md)
- [Core concepts](guides/core-concepts.md)

### Guides
- [How reactivity works](guides/reactivity.md)
- [Universal core (Node, CLI, workers)](guides/universal-core.md)
- [Choosing reactive primitives](guides/choosing-reactive-primitives.md)
- [Handlers](guides/handlers.md)
- [Two-way binding](guides/two-way-binding.md)
- [Lists & repeat](guides/lists.md)
- [Forms](guides/forms.md)
- [Routing](guides/routing.md)
- [Animations](guides/animations.md)
- [Testing](guides/testing.md)
- [Performance](guides/performance.md)
- [Cleanup & Disposal](guides/cleanup-and-dispose.md)
- [SSR & Hydration](guides/ssr-hydration.md)

### API — Core
- [state()](api/core/state.md)
- [bindDom()](api/core/bindDom.md)
- [effect()](api/core/effect.md)
- [batch()](api/core/batch.md)

### API — Addons
- [watch()](api/addons/watch.md)
- [computed()](api/addons/computed.md)
- [repeat()](api/addons/repeat.md) — incl. template mode
- [persist()](api/addons/persist.md)
- [createCleanupGroup()](api/addons/createCleanupGroup.md)
- [hydrateState()](api/addons/hydrateState.md)
- [createDebugPlugin() / debug](api/addons/debug.md)
- [withPlugins()](api/addons/withPlugins.md)
- [isReactive()](api/addons/isReactive.md)

### API — Handlers
- [Handlers API](api/core/handlers.md) — the `{ attr, apply }` extension contract
- [show](api/handlers/show.md)
- [className](api/handlers/className.md)
- [boolAttr](api/handlers/boolAttr.md)
- [ariaAttr](api/handlers/ariaAttr.md)
- [classToggle](api/handlers/classToggle.md)
- [stringAttr](api/handlers/stringAttr.md)
- [on](api/handlers/on.md)
- [htmlAttrs](api/handlers/htmlAttrs.md)

### Tutorials
- [Build a Todo app](tutorials/build-todo-app.md)
- [Build Tic-Tac-Toe](tutorials/build-tic-tac-toe.md)
- [Working with Arrays](tutorials/working-with-arrays.md)

### Design
- [Design decisions](design/design-decisions.md)

### Reference
- [FAQ](guides/faq.md)
- [Migrating from 1.x](guides/migration.md)
- [Changelog](../CHANGELOG.md)

### AI agents
- [Agent guide](../AGENT_GUIDE.md) — rules, pitfalls, and patterns for coding agents using Lume
- [llms.txt](../llms.txt) / [llms-full.txt](../llms-full.txt) — generated doc bundles (`npm run llms`)

---

**Next: [Installation](guides/installation.md) →**
