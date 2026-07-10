# Lume.js Architecture

Developer documentation: how the code works and why. For process rules see [`AGENTS.md`](../AGENTS.md); for the rationale behind each decision see [`docs/design/design-decisions.md`](design/design-decisions.md).

## The problem it solves

Modern reactivity typically costs a build step, custom template syntax, and 15–45 KB of runtime. Lume.js bets that web standards are already sufficient: reactive state via `Proxy`, DOM binding via `data-*` attributes on valid HTML, list rendering via `<template>`. It's positioned as "modern Knockout.js" — for people who want reactive UIs with zero lock-in and code that still runs in 2035.

## Package entries

| Entry | Contents | Size (gz) | Budget |
|---|---|---|---|
| `lume-js/state` | `state`, `batch`, `withReadObserver` — DOM-free kernel | 1.46 KB | ≤ 1.75 KB |
| `lume-js` | kernel + `bindDom`, `effect` | 2.66 KB | ≤ 3 KB |
| `lume-js/handlers` | opt-in attribute handlers | 1.19 KB | ≤ 2 KB |
| `lume-js/addons` | opt-in pattern helpers | pay-per-import | ≤ 6 KB |
| CDN `lume.global.js` | IIFE all-in-one | 7.40 KB | ≤ 8 KB |

## System diagram

```
                        ┌────────────────────────────────────────────┐
                        │                 user code                  │
                        └──────┬──────────────┬──────────────┬───────┘
                               │ writes       │ effect(fn)   │ bindDom(root, store)
                               ▼              ▼              ▼
┌───────────────────────────────────┐  ┌──────────────┐  ┌────────────────────────┐
│ core/state.js                     │  │ core/        │  │ core/bindDom.js        │
│  Proxy set trap                   │  │ effect.js    │  │  compiled selector     │
│   ├─ Object.is change check       │  │  auto-track  │  │  [data-bind]+handlers  │
│   ├─ pendingNotifications (Map)   │◄─┤  via         │  │  resolveProp (once,    │
│   └─ scheduleFlush()              │  │  withRead-   │  │  at bind time)         │
│  Proxy get trap                   │─►│  Observer    │  │  $subscribe per attr   │
│   └─ notify read observers        │  │  or explicit │  │  delegated 'input'     │
│  $subscribe / $beforeFlush        │  │  deps mode   │  │  listener (two-way)    │
└───────────────┬───────────────────┘  └──────────────┘  └───────────┬────────────┘
                │ enqueueIfBatching(handle)?                         │
                ▼                                                    ▼
┌───────────────────────────────────┐               ┌───────────────────────────────┐
│ core/batch.js                     │               │ handlers/* (opt-in)           │
│  batchDepth, batchedStates        │               │  { attr, apply(el, val) }     │
│  synchronous wave flush,          │               │  show, classToggle, boolAttr, │
│  cross-store effect dedupe        │               │  ariaAttr, stringAttr, on, …  │
└───────────────────────────────────┘               └───────────────────────────────┘
                       addons/* build ONLY on core primitives:
        computed · watch · repeat · persist · hydrateState · cleanupGroup · withPlugins · debug
```

**Dependency directions (enforced by convention + review):** `core/state.js` imports only `core/batch.js` and `utils/log.js`. `batch.js` never imports `state.js` (no cycle). Addons import core only — **never other addons**. Handlers import nothing (or `log.js`). All module top-levels are pure (`sideEffects: false`).

## Module walkthrough

### `core/state.js` (~350 lines — the kernel)
- `state(obj)` validates a plain, mutable, non-array object and returns a `Proxy`.
- **Set trap:** blocks `__proto__`/`constructor`/`prototype` (pollution guard), skips unchanged values via `Object.is` (NaN/-0 correct), records into a per-state `pendingNotifications` Map (last write per key wins), schedules a flush.
- **Flush (per-state microtask):** up to 100 iterations of → `$beforeFlush` hooks → `notifySubscribers` (drains the Map *before* delivering, so subscriber write-backs land in the next iteration instead of being lost or double-delivered) → run queued effects (Set-deduped). Iteration cap logs an infinite-loop error.
- **Get trap:** `$`-prefixed keys bypass everything; otherwise the module-level `readers` Set (active read observers) is notified — this is the auto-tracking hook.
- `withReadObserver(onRead, fn)` — runs `fn` with an observer registered; multi-observer safe (nested effects, devtools).
- `REACTIVE_BRAND = Symbol.for('lume.reactive')` — cross-copy brand for `isReactive`; explicitly *not* a security boundary. Non-enumerable, so spreads don't inherit it.
- Subscriber cap: 1000 per key → loud error + no-op unsubscribe (leak/DoS guard).
- `$subscribe(key, fn)` calls immediately with the current value, then on changes.

### `core/batch.js` (~140 lines)
`batch(fn)`: while `batchDepth > 0`, states skip their microtask and enqueue a small *flush handle* (`{runBeforeFlushHooks, notifySubscribers, takeEffects}`) into a module Set. The outermost `batch()` drains synchronously in waves: all subscribers of the wave first, then all effects from one deduped Set — so an effect depending on N mutated stores runs once, not N times. Cascading writes re-enter the Set (depth still held) → next wave, capped at 100. Nested `batch()` is absorbed; a thrown `fn` still flushes writes made before the throw; async `fn` gets a console warning (only pre-await writes batch).

### `core/effect.js` (~210 lines)
Two modes:
- **Auto-tracking (default):** runs `fn` under `withReadObserver`; every `(proxy, key)` read registers a subscription that enqueues the effect into that state's deduped `pendingEffects`. Tracking is a `WeakMap<proxy, Set<key>>` so identical key names on different stores stay distinct. On each rerun, old subscriptions are replaced only if the run produced new ones (an early-return/throwing run keeps the old graph, so the effect stays alive). Nested effects work via a saved/restored `currentEffect` context.
- **Explicit deps:** `effect(fn, [[store, 'key1', 'key2'], …])` subscribes literally and coalesces N key changes per tick into one microtask rerun. Returns a cleanup function that pops all subscriptions.

### `core/bindDom.js` (~240 lines)
Builds one compiled selector from `[data-bind]` plus every handler's `attr`, queries once, and wires each element: `data-bind` gets special two-way treatment (subscription writes element value/textContent; a single **delegated** `input` listener on the root writes back), everything else goes through the uniform handler contract `{ attr, apply(el, val) }` with user handlers overriding same-attr defaults. Defaults: `hidden/disabled/checked/required` (property toggles) + `aria-expanded/aria-hidden`. Paths (`"user.address.city"`) are resolved **once at bind time**; unresolvable paths warn and produce dead bindings (documented tradeoff — no MutationObserver, no re-scan). `applyBindValue` uses `value`/`checked` for form controls and **`textContent`** (never `innerHTML`) for everything else — this is the core XSS posture. If the document is still loading, binding auto-defers to `DOMContentLoaded`.

### `handlers/` — opt-in attribute vocabulary
Each handler is a plain `{attr, apply}` object or a factory returning one: `show` (hidden=!val), `className`, `classToggle(...names)`, `boolAttr(name)`, `ariaAttr(name)`, `stringAttr(name)` (sets/removes string attributes), `on(...types)` (wires the *function stored at the state key* as an event listener), `htmlAttrs()` (kitchen-sink preset), plus `formHandlers`/`a11yHandlers` presets. Writing your own requires no core changes.

### `addons/` — opt-in patterns on top of core primitives
- `computed(fn)` — read-only derived value with `.value` + `.subscribe`, for consumption *outside* stores (inside stores, use `effect` to write back).
- `watch(store, key, fn, {immediate})` — single-key observation.
- `repeat(container, store, key, {key, create/update | template})` — keyed list rendering with element reuse; template mode binds rows straight from a `<template>` element using the same `applyBindValue` as core (semantics never drift).
- `persist(store, key(s), opts)` — localStorage/sessionStorage sync; hydrates on call, saves on change; survives `SecurityError` (private browsing).
- `hydrateState(selector?)` — parse initial state from `<script type="application/json">` (SSR handshake; JSON.parse, no code execution).
- `createCleanupGroup()` — collect unsubscribe functions, dispose all at once.
- `withPlugins` / `debug` — state-extension mechanism and dev-time introspection.

### Build & site pipeline
`scripts/build.js` produces `dist/` (.mjs + .min.mjs per entry + IIFE global build, terser-minified, with sourcemaps). `check-size.js` enforces per-entry gzip budgets; `complexity.js` enforces CC ≤ 10/function and MI ≥ 50/file; `bench-core.js` is a micro-benchmark harness. The docs site is generated from `docs/` markdown + `gh-pages/` shell via `build-site-assets.js` + `vite.site.config.js`, deployed by `.github/workflows/gh-pages.yml`. CI (`ci.yml`) runs the full gate suite; `publish.yml` publishes to npm on GitHub release (with `prepublishOnly: validate`).

## Data flow end-to-end (browser, auto-tracking)

1. `const store = state({count: 0})` → Proxy around the object.
2. `bindDom(document.body, store)` → selector query → `$subscribe('count', …)` per bound element → immediate paint with the current value.
3. `effect(() => { store.doubled = store.count * 2 })` → body runs under a read observer → read of `count` registers the effect on that key.
4. `store.count = 5` → set trap → `pendingNotifications{count: 5}` → microtask.
5. Microtask flush → subscribers fire (DOM textContent/value updates) → queued effects run once each → effect writes `doubled` → same-flush iteration 2 delivers `doubled` → done.
6. User types in `<input data-bind="count">` → delegated input listener → `store.count = valueAsNumber` → cycle repeats. Multiple stores in one gesture? Wrap writes in `batch()` → single synchronous wave, effects deduped across stores.

## Dependency rationale

**Runtime dependencies: zero.** Everything in `package.json` is dev tooling: vitest+jsdom (tests), eslint+sonarjs (lint/complexity), terser (minify), typescript (checks the handwritten `.d.ts`), vite/tailwind/marked/highlight.js (docs site only).

## Extension points

1. **Handlers** — new `data-*` vocabulary, zero core changes.
2. **`withPlugins`** — extend store creation.
3. **`$beforeFlush`** — pre-flush hook per store (used by `withPlugins` for `onNotify`).
4. **`withReadObserver`** — build your own tracking tools/devtools (internal API, may be stabilized later).
5. **Addons pattern** — anything expressible over `state`/`effect`/`$subscribe` belongs in an addon, not the kernel.
