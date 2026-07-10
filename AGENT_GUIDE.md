# Lume.js — Agent Guide

Instructions for AI coding agents (and fast-moving humans) **using Lume.js in
an application**. Read this before writing any Lume code. For developing
Lume.js itself, see `AGENTS.md` instead.

- Machine-readable doc bundle: `llms.txt` (index) and `llms-full.txt`
  (this guide + every guide, tutorial, and API page in one file) ship with
  the npm package and live at the repo root.
- Full human docs: <https://github.com/sathvikc/lume-js/tree/main/docs>

## Mental model (30 seconds)

Lume is **standards-only reactivity**: a `Proxy`-based store (`state`),
auto-tracking side effects (`effect`), and declarative DOM binding through
plain `data-*` attributes (`bindDom`). No components, no virtual DOM, no
compiler, no build step. HTML stays valid HTML; JavaScript stays standard
JavaScript. You own the DOM structure; Lume keeps it in sync with state.

```javascript
import { state, effect, bindDom, batch } from 'lume-js';

const store = state({ name: 'World', count: 0 });
bindDom(document.body, store);          // wires all data-* attrs under body
effect(() => {                          // auto-tracks store.count
  document.title = `Count: ${store.count}`;
});
store.count++;                          // DOM + title update on next microtask
```

```html
<h1>Hello, <span data-bind="name"></span>!</h1>
<input data-bind="name">   <!-- two-way on inputs, one-way on text elements -->
```

## Package entries — import from the right place

| Import | Size (gz) | Gives you | Use in |
|---|---|---|---|
| `lume-js` | 2.66 KB | `state`, `effect`, `bindDom`, `batch`, `withReadObserver` | browsers |
| `lume-js/state` | 1.46 KB | `state`, `batch`, `withReadObserver` (no DOM code) | Node, workers, CLI, SSR |
| `lume-js/addons` | pay per import | `computed`, `watch`, `repeat`, `persist`, `hydrateState`, `createCleanupGroup`, `debug` | optional patterns |
| `lume-js/handlers` | pay per import | `show`, `classToggle`, `boolAttr`, `ariaAttr`, `stringAttr`, `className`, `on`, `htmlAttrs`, presets | extra `data-*` attributes |

CDN (no build): `https://cdn.jsdelivr.net/npm/lume-js/dist/index.min.mjs`
(also `/dist/state.min.mjs`, `/dist/addons.min.mjs`, `/dist/handlers.min.mjs`).

## The rules — violating any of these produces silently broken code

1. **Never mutate arrays or nested objects in place. Replace them.**
   Lume detects changes with reference equality (`Object.is`) on top-level
   keys only.
   ```javascript
   store.items.push(x);                  // ❌ silent — no update ever fires
   store.items = [...store.items, x];    // ✅
   store.items = store.items.filter(t => t.id !== id);          // ✅ remove
   store.items = store.items.map(t => t.id === id ? { ...t, done: true } : t); // ✅ update
   store.items = [...store.items].sort(cmp);                    // ✅ sort (copy first!)
   ```

2. **Nested objects are not reactive unless explicitly wrapped.**
   ```javascript
   const s = state({ user: { name: 'Ada' } });
   s.user.name = 'Z';                          // ❌ silent
   const s2 = state({ user: state({ name: 'Ada' }) });
   s2.user.name = 'Z';                         // ✅ notifies
   // or replace the whole object:
   s.user = { ...s.user, name: 'Z' };          // ✅ notifies subscribers of 'user'
   ```

3. **Updates are asynchronous (microtask-batched per store).** After a
   write, the DOM updates on the next microtask, not synchronously. In
   tests, flush before asserting:
   ```javascript
   store.count = 5;
   await Promise.resolve();     // or await new Promise(r => setTimeout(r))
   expect(el.textContent).toBe('5');
   ```
   Multiple writes to the same store in one tick coalesce into one flush,
   and subscribers see only the final value of each key.

4. **Effects track only what they read synchronously.** Reads after an
   `await`, inside `setTimeout`, or inside event callbacks are NOT tracked.
   Read every dependency at the top of the effect body. Conditional reads
   re-track on every run (only the branch actually taken is tracked). Writes
   inside an effect do not create subscriptions — only reads do.

5. **Keep and call the dispose functions.** `effect()`, `bindDom()`,
   `watch()`, `repeat()`, `persist()`, `$subscribe()`, and
   `computed().subscribe()` all return a cleanup/unsubscribe function.
   Call it when the UI section goes away, or collect them:
   ```javascript
   import { createCleanupGroup } from 'lume-js/addons';
   const group = createCleanupGroup();
   group.add(effect(() => { /* … */ }));
   group.add(bindDom(panel, store));
   group.dispose();   // dispose everything at once
   ```
   Creating effects/subscriptions in a loop without cleanup eventually hits
   the per-key subscriber cap (1000) and logs a console error.

6. **Writing several stores from one event? Wrap it in `batch()`.**
   Per-store microtask batching already dedupes same-store writes; an effect
   reading N stores mutated in the same tick still runs once per store.
   `batch(fn)` flushes synchronously when the outermost batch ends, running
   cross-store effects exactly once. `fn` must be synchronous — writes after
   an `await` inside it are NOT batched.
   ```javascript
   batch(() => {
     cart.items = [...cart.items, item];
     totals.sum += item.price;
     ui.message = 'Added!';
   });
   ```

7. **Stores hold plain objects.** `state()` throws on non-objects, arrays,
   and frozen/sealed objects at the top level. `Map`/`Set` are not reactive
   (use arrays/objects). Class instances mostly work but private fields
   bypass the proxy. Functions stored on state stay plain (usable with the
   `on()` handler). Keys starting with `$` are reserved meta API
   (`$subscribe`, `$beforeFlush`); writes to `__proto__`/`constructor`/
   `prototype` are blocked.

8. **`data-*` attribute values are state keys, never expressions.**
   `data-bind="user.name"`, `data-show="count > 0"` — ❌ not supported.
   Derive a flat key in JS instead:
   ```javascript
   effect(() => { store.hasItems = store.items.length > 0; });
   ```
   ```html
   <div data-show="hasItems">…</div>
   ```

## Choosing the right primitive

| You want to… | Use |
|---|---|
| Derive a value **into the store** (for `data-bind`) | `effect(() => { store.full = store.a + store.b; })` |
| Derive a read-only value consumed **outside** the store | `computed(() => store.a * 2)` → `.value`, `.subscribe(fn)`, `.dispose()` |
| React to **one specific key** (analytics, localStorage, manual DOM) | `watch(store, 'key', fn)` — options `{ immediate: false }` to skip the initial call |
| Run side effects when **anything read** changes | `effect(fn)` (auto-tracking) |
| Side effect with **no magic tracking** | `effect(fn, [[store, 'key1', 'key2'], [other, 'k']])` (explicit deps, coalesced to one run per microtask) |
| Render an **array** as DOM elements | `repeat(container, store, 'items', { key: it => it.id, … })` |
| Low-level single-key subscription (no tracking) | `store.$subscribe('key', fn)` — calls immediately with current value |

Anti-pattern: calling `$subscribe` for a key inside an `effect` that also
reads that key — the logic runs twice. Pick one mechanism.

## Built-in `data-*` attributes (core `bindDom`)

```html
<input data-bind="name">                  <!-- two-way: input/checkbox/radio/select/textarea -->
<span data-bind="name"></span>            <!-- one-way textContent -->
<div  data-hidden="isLoading">…</div>     <!-- boolean attrs: hidden/disabled/checked/required -->
<button data-disabled="isSubmitting">Go</button>
<button data-aria-expanded="menuOpen">Menu</button>  <!-- ARIA: "true"/"false" strings -->
```

More attributes are opt-in handlers, passed to `bindDom`:

```javascript
import { show, classToggle, stringAttr, on } from 'lume-js/handlers';
bindDom(root, store, { handlers: [show, classToggle('active'), stringAttr('href'), on('click')] });
```

```html
<span data-show="isVisible">…</span>            <!-- el.hidden = !truthy -->
<div data-class-active="isActive">…</div>       <!-- toggles the 'active' class -->
<a data-href="profileUrl">Profile</a>           <!-- string attr, removed on null -->
<button data-onclick="addItem">Add</button>     <!-- store.addItem wired as listener -->
```

Custom handlers are plain objects: `{ attr: 'data-tooltip', apply(el, val) { el.title = val ?? ''; } }`.
`htmlAttrs()` is the one-import preset covering standard HTML + ARIA attrs.

## Lists with `repeat()` (keyed, element-reusing)

```html
<ul id="todos">
  <template>   <!-- row structure is a standard <template>; $index is provided -->
    <li><span data-bind="title"></span> <em data-bind="$index"></em></li>
  </template>
</ul>
```

```javascript
import { repeat } from 'lume-js/addons';
repeat('#todos', store, 'todos', { key: t => t.id, template: true });
```

Imperative variant when you need custom DOM per row:

```javascript
repeat(listEl, store, 'items', {
  element: 'li',
  key: it => it.id,
  create: (it, el) => { /* build row structure once */ },
  update: (it, el) => { /* sync data on every change */ },
});
```

`repeat` diffs by `key` against the previous array — which is why rule #1
(immutable array updates) is non-negotiable.

## Canonical app skeleton

```html
<!DOCTYPE html>
<html lang="en">
<body>
  <input data-bind="query" placeholder="Search">
  <p data-show="loading">Loading…</p>
  <ul id="results"><template><li data-bind="title"></li></template></ul>
  <script type="module" src="./app.js"></script>
</body>
</html>
```

```javascript
import { state, effect, bindDom, batch } from 'lume-js';
import { repeat, watch, persist, createCleanupGroup } from 'lume-js/addons';
import { show } from 'lume-js/handlers';

const store = state({ query: '', loading: false, results: [] });
const group = createCleanupGroup();

group.add(bindDom(document.body, store, { handlers: [show] }));
group.add(repeat('#results', store, 'results', { key: r => r.id, template: true }));
group.add(persist(store, 'my-app', { keys: ['query'] }));  // localStorage sync

group.add(watch(store, 'query', async (q) => {
  store.loading = true;
  const results = await fetchResults(q);
  batch(() => {                 // one flush for both writes
    store.results = results;    // replace, never mutate
    store.loading = false;
  });
}, { immediate: false }));
```

## Debugging & testing

- `import { debug } from 'lume-js/addons'` — `debug(store, { label: 'cart' })`
  logs every write and flush to the console; returns a disposer.
- Nothing updates? Check, in order: (1) mutated an array/nested object in
  place (rule 1/2), (2) asserted synchronously before the microtask flush
  (rule 3), (3) the read happened after an `await` inside an effect (rule 4),
  (4) `bindDom` was called before the element existed, or on a root that
  doesn't contain it.
- Effect runs too often? Reading many stores in one effect while writing
  them separately — wrap the writes in `batch()` (rule 6).
- Console error about subscriber limit (1000/key) or max flush iterations
  (100) = subscription leak in a loop, or an effect writing a key it also
  reads (infinite cascade).
- Tests: jsdom + vitest work fine. Write state → `await Promise.resolve()` →
  assert DOM. See `docs/guides/testing.md`.

## SSR / no-DOM environments

Import `state`/`batch` from `lume-js/state` (1.46 KB, zero DOM references) in
Node/workers/CLI. For server-rendered pages, inline initial state as
`<script type="application/json">` and hydrate with
`hydrateState()` (`lume-js/addons`), then call `bindDom` as usual.

## Keeping agents up to date

`llms.txt` and `llms-full.txt` are regenerated from this guide plus the
docs tree by `npm run llms`, and CI fails when they drift — whatever version
of `lume-js` is installed, the bundled files match its actual behavior. In a consuming
project, add one line to your agent config (`CLAUDE.md`, `.cursorrules`,
`AGENTS.md`, …):

> Before writing any code that uses lume-js, read
> `node_modules/lume-js/AGENT_GUIDE.md`. For API details beyond the guide,
> consult `node_modules/lume-js/llms-full.txt`.
