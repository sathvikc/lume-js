<div align="center">
  <img src="lume-logo.png" alt="Lume.js" width="128"><br><br>
  <h3>Lume.js</h3>
  <p><strong>Reactivity that follows web standards.</strong></p>
  <p>
    Minimal reactive state management using only standard JavaScript and HTML.<br>
    No custom syntax &nbsp;·&nbsp; No build step &nbsp;·&nbsp; No framework lock-in.<br>
    <strong><!-- lume:size-state -->1.46<!-- /lume:size-state --> KB universal core</strong> &nbsp;·&nbsp; <strong><!-- lume:size-index -->2.66<!-- /lume:size-index --> KB with DOM</strong>
  </p>
  <p>
    <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-blue.svg" alt="License: MIT"></a>
    &nbsp;
<!-- lume:badge-version -->
    <a href="package.json"><img src="https://img.shields.io/badge/version-2.3.1-orange.svg" alt="v2.3.1"></a>
<!-- /lume:badge-version -->
    &nbsp;
<!-- lume:badge-tests -->
    <a href="tests/"><img src="https://img.shields.io/badge/tests-464%20passing-brightgreen.svg" alt="464 tests"></a>
<!-- /lume:badge-tests -->
    &nbsp;
<!-- lume:badge-size-state -->
    <a href="scripts/check-size.js"><img src="https://img.shields.io/badge/universal%20core-1.46KB-blue.svg" alt="universal core 1.46KB"></a>
<!-- /lume:badge-size-state -->
    &nbsp;
<!-- lume:badge-size-index -->
    <a href="scripts/check-size.js"><img src="https://img.shields.io/badge/core%20%2B%20DOM-2.66KB-blue.svg" alt="core + DOM 2.66KB"></a>
<!-- /lume:badge-size-index -->
  </p>
  <p><code>npm install lume-js</code></p>
  <p><a href="https://sathvikc.github.io/lume-js/"><strong>Docs & live examples →</strong></a></p>
</div>

---

## Why Lume.js?

| Feature | Lume.js | Alpine.js | Vue | React |
|---------|---------|-----------|-----|-------|
| Custom Syntax | ❌ No | ✅ `x-data` | ✅ `v-bind` | ✅ JSX |
| Build Step | ❌ Optional | ❌ Optional | ⚠️ Recommended | ✅ Required |
| Bundle Size | <!-- lume:size-state -->1.46<!-- /lume:size-state -->–<!-- lume:size-index -->2.66<!-- /lume:size-index -->KB | ~15KB | ~35KB | ~45KB |
| HTML Validation | ✅ Pass | ⚠️ Warnings | ⚠️ Warnings | ❌ JSX |
| Extensible Handlers | ✅ | ❌ Built-in only | ❌ Built-in only | N/A |

**Lume.js is "Modern Knockout.js" — standards-only reactivity for the modern web.**

---

## Installation

### Pick your entry

| Entry | Size (gz) | Contents | For |
|-------|-----------|----------|-----|
| `lume-js/state` | **<!-- lume:size-state -->1.46<!-- /lume:size-state --> KB** | `state`, `batch`, `withReadObserver` | Node, Deno, Bun, workers, CLI — anywhere without a DOM |
| `lume-js` | **<!-- lume:size-index -->2.66<!-- /lume:size-index --> KB** | + `bindDom`, `effect` | Browsers |
| `lume-js/addons` | pay per import | `computed`, `watch`, `repeat`, `persist`, … | Optional patterns |
| `lume-js/handlers` | pay per import | `show`, `classToggle`, `on`, … | Extra reactive attributes |

### Via CDN (Recommended for simple projects)

```html
<script type="module">
  import { state, bindDom, effect } from 'https://cdn.jsdelivr.net/npm/lume-js/dist/index.min.mjs';
</script>
```

DOM-free kernel only (servers, workers, embedded):

```html
<script type="module">
  import { state, batch } from 'https://cdn.jsdelivr.net/npm/lume-js/dist/state.min.mjs';
</script>
```

### Via NPM (Recommended for bundlers)

```bash
npm install lume-js
```

```javascript
import { state, bindDom } from 'lume-js';        // browser: full core
<!-- lume:comment-size-state -->
import { state, batch } from 'lume-js/state';    // Node/CLI/workers: 1.46 KB kernel
<!-- /lume:comment-size-state -->
```

> **→ Using Lume without a DOM?** See the [Universal core guide](docs/guides/universal-core.md).


### Browser Support

| Browser | Minimum version |
|---------|-----------------|
| Chrome  | <!-- lume:browser-chrome -->80+<!-- /lume:browser-chrome -->             |
| Firefox | <!-- lume:browser-firefox -->74+<!-- /lume:browser-firefox -->             |
| Safari  | <!-- lume:browser-safari -->13.1+<!-- /lume:browser-safari -->           |
| Edge    | <!-- lume:browser-edge -->80+<!-- /lume:browser-edge -->             |
| IE11    | ❌ Not supported |

The floor comes from optional chaining / nullish coalescing (ES2020) used in the source — shipped un-transpiled, true to no-build. IE11 cannot be polyfilled regardless: Lume uses `Proxy`.

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

### Lists? Also just HTML.

```html
<ul id="todos">
  <template>
    <li><span data-bind="title"></span> <em data-bind="$index"></em></li>
  </template>
</ul>
```

```javascript
import { repeat } from 'lume-js/addons';

repeat('#todos', store, 'todos', { key: t => t.id, template: true });
```

The row structure is a standard `<template>` element — no `createElement`, no JSX, no custom syntax.

### Multiple stores? Batch them.

```javascript
import { batch } from 'lume-js';

batch(() => {
  cart.items = [...cart.items, item];
  totals.sum += item.price;
  ui.message = 'Added!';
});
// effects depending on several stores ran exactly ONCE, synchronously
```

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

**Handlers** are plain objects that teach `bindDom()` how to interpret new `data-*` attributes. They live in `lume-js/handlers` and are entirely optional — import only the ones you use. You can also write your own with just an `attr` string and an `apply` function.

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
| `className` | `data-classname="key"` | Replaces full class string (`el.className = val`) |
| `boolAttr(name)` | `data-readonly="key"` | Toggles any boolean attribute |
| `ariaAttr(name)` | `data-aria-pressed="key"` | Sets ARIA attribute to "true"/"false" |
| `classToggle(...names)` | `data-class-active="key"` | Toggles individual CSS classes |
| `stringAttr(name)` | `data-href="key"` | Sets string attributes (removes on null) |
| `on(...types)` | `data-onclick="key"` | Wires the function at that state key as an event listener |
| `htmlAttrs()` | *(all of the above)* | One-import preset — all standard HTML + ARIA attrs |

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

**Addons** are optional reactive pattern helpers that build on the core primitives. They handle common use cases that would otherwise require boilerplate — derived values, key observation, list rendering. Import only what you need from `lume-js/addons`; none are loaded by default.

```javascript
import { computed, watch, repeat } from 'lume-js/addons';
```

| Addon | When to use |
|-------|-------------|
| `effect(fn)` *(core)* | Write derived values back into the store, or trigger side effects on state change |
| `computed(fn)` | Derive a read-only value from state to consume *outside* the store (templates, display logic) |
| `watch(store, key, fn)` | React to a *specific* key changing — DOM updates, analytics, syncing external state |
| `repeat(container, store, key, opts)` | Render a keyed list with element reuse — incl. declarative `template:` mode bound straight from a `<template>` element |
| `persist(store, key, opts)` | Sync selected keys with localStorage/sessionStorage — hydrate on call, auto-save on change |
| `createCleanupGroup()` | Collect multiple cleanup/unsubscribe functions and dispose them all at once |
| `hydrateState(selector?, validate?)` | Read initial state from a `<script type="application/json">` tag (SSR hydration), with optional schema validation |

**Quick rule:** `effect` for writing back into state → `computed` for reading outside state → `watch` for observing a single key → `repeat` for arrays in the DOM.

### `effect()` vs `computed()` vs `watch()`

```javascript
import { state, effect } from 'lume-js';
import { computed, watch } from 'lume-js/addons';

const store = state({ firstName: 'Ada', lastName: 'Lovelace', count: 0 });

// effect() — derives a value and writes it back into the store
// Use when the result lives in state and drives the DOM via data-bind
effect(() => {
  store.fullName = `${store.firstName} ${store.lastName}`;
});

// computed() — derives a value to read externally (e.g. display, logging)
// Use when the result is consumed outside the store
const doubled = computed(() => store.count * 2);
console.log(doubled.value); // 10
doubled.subscribe(val => document.title = `Count × 2: ${val}`);

// watch() — reacts to a single key changing
// Use for side effects tied to one property: analytics, localStorage, DOM sync
watch(store, 'count', (val) => {
  localStorage.setItem('count', val);
});

// watch() with { immediate: false } — skip the initial call
watch(store, 'count', (val) => {
  sendAnalytics('count_changed', val); // only on actual changes
}, { immediate: false });
```

---

## Using Lume.js with AI agents

Lume ships agent-ready documentation **inside the npm package**, regenerated from the docs on every change (CI-enforced), so it always matches the installed version:

| File | What it is |
|------|-----------|
| [`AGENT_GUIDE.md`](AGENT_GUIDE.md) | Distilled rules, pitfalls, and canonical patterns — one read teaches an agent to write correct Lume code |
| [`llms.txt`](llms.txt) | [llmstxt.org](https://llmstxt.org) index of all docs, for web-browsing agents |
| [`llms-full.txt`](llms-full.txt) | Every guide, tutorial, and API page in one file |

In a project that uses Lume, add one line to your agent config (`CLAUDE.md`, `AGENTS.md`, `.cursorrules`, …):

```markdown
Before writing any code that uses lume-js, read node_modules/lume-js/AGENT_GUIDE.md.
For API details beyond the guide, consult node_modules/lume-js/llms-full.txt.
```

No install? Point the agent at the hosted copies: `https://raw.githubusercontent.com/sathvikc/lume-js/main/AGENT_GUIDE.md` and `…/llms-full.txt`.

---

## Documentation

Browse the full docs at **[sathvikc.github.io/lume-js](https://sathvikc.github.io/lume-js/)**, or read the source markdown in the [docs/](docs/) directory:

- **Tutorials**
    - [Build a Todo App](docs/tutorials/build-todo-app.md)
    - [Build Tic-Tac-Toe](docs/tutorials/build-tic-tac-toe.md)
    - [Working with Arrays](docs/tutorials/working-with-arrays.md)
- **API Reference**
    - [state()](docs/api/core/state.md) — Reactive state
    - [bindDom()](docs/api/core/bindDom.md) — DOM binding
    - [effect()](docs/api/core/effect.md) — Reactive effects
    - [batch()](docs/api/core/batch.md) — Cross-store write batching
    - [Handlers](docs/api/core/handlers.md) — Extensible attribute handlers
    - [Plugins](docs/api/addons/withPlugins.md) — State extension system
    - [Addons](docs/api/addons/computed.md) — computed, watch, repeat, persist, createCleanupGroup, hydrateState
- **Guides**
    - [Universal core (Node, CLI, workers)](docs/guides/universal-core.md) — using `lume-js/state` without a DOM
    - [Choosing reactive primitives](docs/guides/choosing-reactive-primitives.md) — when to use effect vs computed vs watch
    - [Cleanup & Disposal](docs/guides/cleanup-and-dispose.md) — tearing down effects, bindings, and subscriptions
    - [SSR & Hydration](docs/guides/ssr-hydration.md) — server-rendered HTML with reactive hydration
- **Design**
    - [Design Decisions](docs/design/design-decisions.md)

---

## Contributing

We welcome contributions! Please read [CONTRIBUTING.md](CONTRIBUTING.md) for details.

## License

MIT © [Sathvik C](https://github.com/sathvikc)
