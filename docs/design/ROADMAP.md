# Lume.js Roadmap

> **Purpose:** The execution plan — what to build next, in what order, and *why*. Every item says what it is, why it matters, where it lives in the code, how to approach it, what artifacts it needs, and when it counts as done. A new session should be able to pick up any item from this file alone.
> **Created:** 2026-10-21 · **Baseline:** v2.4.0 · 475 tests · 100% coverage · sizes (gz): `state` 1.49 / 1.75 KB, `index` 2.77 / 3.00 KB, `handlers` 1.23 / 2.00 KB, `addons` 4.96 / 6.00 KB, `global` 7.75 KB
> **Status:** Living document. When an item ships, tick it here, mark it ✅ in `VISION.md` if it appears there, and add a dated note.

---

## How to use this document

1. Read `AGENTS.md` (process contract), then `docs/design/design-decisions.md` (ratified decisions), then this file. `VISION.md` owns direction and philosophy; this file owns the concrete backlog.
2. Pick items **in phase order** unless there is a reason not to. Phase 1 items are verified bugs in shipped code.
3. Each item lists the artifacts `AGENTS.md`'s matrix requires. Items marked **Decision gate** must land their `design-decisions.md` entry/amendment *before or with* the code — the ratified entry wins until it is amended.
4. One item = one commit (or one proposal branch for the large ones), carrying all its artifacts. All five quality gates must pass.
5. Headroom is tight on `index` (0.23 KB left) and `state` (0.26 KB left). Any item touching core must report its size delta in the commit body.

---

## Where this roadmap came from

The items below were derived from three code-level reviews done on 2026-10-20/21. Nothing here was taken from a README; every claim about Lume was reproduced by running Lume's own source, and every claim about another library was traced through its source code.

### 1. Comparison with Gea (`dashersw/gea` @ `51da237`)

Gea is a compiler-first JSX framework (Vite plugin, class components, router, SSR, UI kit) with a Proxy-based `Store`. Overlap with Lume is ~15–20%: both wrap state in a `Proxy` and deliver key-level notifications on a microtask. Everything else differs — Gea competes with Solid/Svelte, Lume with Alpine/petite-vue.

What we learned:

- **Ideas worth taking:** an O(1) "selected row" class toggle for keyed lists (Gea's `relationalClass`) → **R8**; document-level event delegation → **R9**.
- **Mistakes to avoid** (traced in Gea's source): its tracking "locks" after two stable runs and stops tracking, so conditional dependencies (`flag ? a : b`) go stale; one throwing single observer can leave other stores permanently unflushed; `silent()` drops writes queued before it; no prototype-key guard (`new Store(JSON.parse(untrusted))` can swap the store's prototype); compiled `href` bindings skip URL sanitization. Lume already avoids every one of these — keep it that way.
- **Gap shared by both libraries:** getters on state objects are not tracked → **R4**.

### 2. Comparison with Regor (`PureStackStudio/Regor` @ `2203462`)

Regor is petite-vue-shaped: no build step, binds existing HTML, but uses custom directive syntax (`r-for`, `r-if`, `:attr`, `@click`, `{{ }}`) evaluated by its own JS expression interpreter, with callable refs instead of Proxies. Overlap with Lume is ~35–40% (no-build, existing-DOM binding, keyed lists with LIS, `batch`, `persist`, computed).

What we learned:

- **Ideas worth taking:** head/tail trimming before LIS in keyed diffing → **R6**; a subtree boundary for nested bound regions (Regor's `r-pre`) → **R3**; lazy computed → **R10**.
- **Mistakes to avoid:** its expression evaluator does not block `constructor`, so `{{ Array.constructor('…')() }}` reaches `Function` — any user content that lands in server markup becomes code (template injection); no URL filtering on `:href`; its `html` tag is plain string concatenation with no escaping; synchronous flushing exposes intermediate states; `ref()` rewrites user objects in place and swaps array prototypes. Lume's "paths, not expressions" rule makes the first class of bug structurally impossible → **R16** turns that into documentation.

### 3. Review of five external suggestions (2026-10-21)

| Suggestion | Verdict | Outcome |
|---|---|---|
| Dependency-tracked `computed()` | Already exists (auto-tracking via `effect()`, `Object.is` dedupe, conditional deps, idempotent `dispose()` — all verified). Its example API (`state("str")`, `.value`) is not Lume. | Testing it exposed a real bug → **R1** |
| Keyed, DOM-stable `repeat()` | Already shipped (key→element `Map`, LIS minimal moves, identity tests at `tests/addons/repeat.test.js:1223`, duplicate-key warning). Proposed signature would be a breaking change. | Nothing new; head/tail trimming → **R6** |
| Deterministic cleanup for bindings | Already true where Lume owns the binding: all disposers are idempotent, `repeat()` runs `create()`-returned cleanups, template rows hold no subscriptions. | Ownership of *user-created* effects → **R12** |
| `watch()` passes previous value | Valid — callbacks receive one argument today (verified). | **R5** |
| Nested bindings survive object replacement | Valid — four failures reproduced. Its example used a plain nested object, which never renders in Lume by design; its "data-bind only" scope was wrong. | **R2** |

---

## Overview

| ID | Item | Phase | Type (AGENTS matrix) | Decision gate | Verified |
|---|---|---|---|---|---|
| R1 | Fix stale `computed()` after same-flush writes | 1 | Bug fix | No | ✅ reproduced |
| R2 | Nested `data-*` paths follow object replacement | 1 | Behavior change | **Yes** | ✅ reproduced |
| R3 | Boundary for nested `bindDom` roots | 1 | Behavior change / new attr | **Yes** | ✅ reproduced |
| R4 | Getters on state objects become reactive | 2 | Behavior change (kernel) | **Yes** (amend) | ✅ reproduced |
| R5 | `watch()` callback gets `(next, previous)` | 2 | Behavior change (addon) | No | ✅ reproduced |
| R6 | `repeat()` head/tail trimming before LIS | 2 | Perf (no API change) | Amend note | n/a (perf) |
| R7 | `stringAttr`: treat `data` as a URL attribute | 2 | Security hardening | Short note | Low priority |
| R8 | `repeat()` O(1) selection option | 3 | New public API (option) | **Yes** | n/a (feature) |
| R9 | Delegated `on()` handler | 3 | Behavior change | **Yes** | Needs design |
| R10 | Lazy `computed()` | 3 | Behavior change | **Yes** | Low priority |
| R11 | Decision amendments for optional JSX | 4 | Docs (decision) | **Is the gate** | — |
| R12 | Owner scope for JSX-created effects | 4 | New public API | via R11 | — |
| R13 | `lume-js/jsx-runtime` | 4 | New public API + entry | via R11 | — |
| R14 | `lume-js/html` tagged template | 4 | New public API + entry | via R11 | — |
| R15 | JSX/html docs, types, examples, budgets | 4 | Docs/tooling | — | — |
| R16 | Security guide ("no expressions" posture) | 5 | Docs | No | — |
| R17 | `VISION.md` cleanup + "HTML-first, JSX-optional" | 5 | Docs | No | — |
| R18 | Re-measure the Code Verbosity challenge | 5 | Docs | No | — |

---

## Phase 1 — Correctness (verified bugs in shipped code)

These come first because they are wrong behavior today, not missing features. Each was reproduced against `src/`.

### R1. Fix stale `computed()` after a same-flush write

- [ ] Status

**What:** `computed()` can permanently miss an update when one of its dependencies is written again later in the *same* flush.

**Why:** It silently shows a wrong value and never self-corrects until the next unrelated change — the worst kind of reactive bug. Any "normalize/clamp" effect triggers it.

**Repro (verified):**

```js
const s = state({ a: 1 });
const dbl = computed(() => s.a * 2);
effect(() => { if (s.a > 10) s.a = 10; });
s.a = 50;
// after flush: s.a === 10, dbl.value === 100  ← should be 20, and it stays 100
```

**Root cause:** `src/addons/computed.js` sets `isInComputation = true` around `fn()` and clears it in a `queueMicrotask` (to suppress self-mutation loops). The clamp effect runs in the same flush loop after the computed, writes `s.a`, and the flush's next iteration re-queues the computed — which sees the flag still set and returns. Nothing retries it.

**How (direction, decide test-first):** Don't drop a re-run requested while guarded — record it (`rerunRequested = true`) and, when the guard clears, recompute once if requested. Keep the existing loop protection: a computed that mutates its own dependency must still terminate (bounded by `MAX_FLUSH_ITERATIONS`-style cap or by the guard's current "skip the self-triggered flush" semantics). Alternative to evaluate: remove the deferred guard entirely and rely on the effect flush cap (100 iterations + error log), which is how plain `effect()` already behaves — but that changes the documented "circular self-mutations are automatically suppressed" behavior, which would then need a decision entry.

**Where:** `src/addons/computed.js`, `tests/addons/computed.test.js`.

**Artifacts:** regression test (the repro above), CHANGELOG `Fixed`. No decision entry unless the self-mutation semantics change.

**Done when:** repro yields `20`; existing self-mutation tests still pass; a computed writing to its own dependency still terminates; coverage 100%.

### R2. Nested `data-*` paths follow object replacement

- [ ] Status · **Decision gate**

**What:** A binding like `data-bind="user.name"` should keep working when `store.user` is replaced, and should activate when `user` starts as `null` and is assigned later.

**Why:** Async data is the normal case (`user: null` → fetch → `store.user = state({...})`). Today the binding resolves its path once at bind time and is permanently attached to whatever object existed then. Reproduced failures:

1. `store.user = state({ name: 'Sam' })` → the span still shows `Alex`.
2. Typing into a bound input writes to the **old** user object.
3. Mutating the old object still updates the DOM.
4. `profile: null` at bind time → assigning `store.profile` later never activates the binding.

**How:**

- In `resolveProp()` (`src/core/bindDom.js`), for multi-segment paths build a **subscription chain**: `$subscribe` to the first key on the store; when it changes, tear down everything downstream, and if the new value is reactive, `$subscribe` to the next key on it, and so on to the leaf, which calls the handler's `apply`. `$subscribe` fires immediately with the current value, so the chain builds itself at bind time.
- Single-segment paths (`data-bind="count"`) must take the **current fast path unchanged** — zero overhead for the common case.
- Two-way: the delegated input handler's `bindingMap` entry `{ target, key }` must be updated whenever the leaf target changes, so typing always writes to the *current* object.
- Broken chain (intermediate `null`/`undefined`): apply `undefined` (renders empty, same as a missing value) and keep watching. Intermediate that is a non-null **plain** object: keep today's "not reactive" warning — nested state must still be explicitly wrapped (ratified decision, unchanged).
- Apply to **all** handlers, not just `data-bind`: handlers share `resolveProp`, and two different path semantics would be a trap.
- `bindDom()`'s returned cleanup tears down every link in every chain.

**Where:** `src/core/bindDom.js`, `tests/core/bindDom.test.js`, `docs/api/core/bindDom.md`, `docs/guides/two-way-binding.md`, `docs/ARCHITECTURE.md` (line ~72 currently calls this a "documented tradeoff"), `CLAUDE.md` gotcha "Bind-time path resolution", `AGENT_GUIDE.md` if it mentions dead bindings.

**Artifacts:** tests (the four failures + "old object no longer drives the DOM" + cleanup stops the chain + handler path), API docs, CHANGELOG `Changed`, **decision entry** (reverses the bind-time-only behavior; record why, and why chains instead of re-scanning or MutationObserver).

**Size:** lands in the `index` entry (0.23 KB headroom). Measure; keep the chain logic compact and shared by all handlers.

**Done when:** all four repro cases pass; flat paths unchanged in behavior and cost; cleanup leaves zero subscriptions (assert via unsubscribe spies).

### R3. Boundary for nested `bindDom` roots

- [ ] Status · **Decision gate**

**What:** A way to tell an outer `bindDom()` not to bind inside a region owned by another store.

**Why:** `bindDom(root)` uses `root.querySelectorAll(...)`, which reaches into nested islands. Reproduced: outer store `A = { title }`, inner region bound to `B = { query }` with `<input data-bind="query">`. Result: typing writes to **both** stores, `A` gains a stray `query` key, and after `B.query = 'fromB'` the input shows `A`'s value — the outer flush runs second and overwrites it. Islands embedded in a page-level binding are a core Lume use case (WordPress/Shopify widgets).

**How:** A `data-*` boundary attribute (name to be decided in the decision entry, e.g. `data-lume-scope`) placed on the inner container. The outer `bindDom` skips matched elements whose closest boundary (between the element and the root) is not the root itself. Because the outer binding never registers those elements, its delegated `input` handler never writes to them either. The inner `bindDom(innerEl, B)` is unaffected (its root is the boundary).

**Where:** `src/core/bindDom.js`, tests, `docs/api/core/bindDom.md`, a short section in a guide about islands.

**Artifacts:** tests (the repro + boundary on root itself still binds + deeply nested boundaries), docs, CHANGELOG `Added`, decision entry (new attribute; why opt-in attribute rather than automatic root detection — order of `bindDom` calls is not knowable).

**Done when:** the repro shows `A` untouched and `B` driving the input.

---

## Phase 2 — Small, high-value improvements

### R4. Getters on state objects become reactive

- [ ] Status · **Decision gate (amend "Why No Computed Properties in Core?")**

**What:** Make `get` accessors on state objects auto-tracked inside `effect()`/`computed()`.

**Why:** Today this silently never updates (verified):

```js
const s = state({ first: 'a', last: 'b', get full() { return this.first + ' ' + this.last; } });
effect(() => seen = s.full);
s.first = 'Z';   // seen stays "a b"
```

The `get` trap reads `target[key]` (`src/core/state.js:283`), so the getter runs with `this` = the raw object and its reads bypass the Proxy. Getters are plain standard JavaScript — making them work is "standards-only" at its best, and covers most uses of `computed()` with zero API.

**How:** Read with `Reflect.get(target, key, proxy)` so the getter's `this` is the proxy and its reads are tracked. Writes inside getters then go through the set trap (acceptable; document it).

**Caveats to document:** `$subscribe('full')` will **never** fire — nothing ever writes that key. Getters work with `effect`/`computed`/`repeat` over computed, not with key subscriptions or `data-bind="full"` (which uses `$subscribe`). Decide in the decision entry whether `bindDom` should get a getter-aware path later (out of scope here).

**Where:** `src/core/state.js`, `tests/core/state.test.js`, `tests/core/effect.test.js`, `docs/api/core/state.md`, `docs/guides/choosing-reactive-primitives.md`.

**Artifacts:** tests, docs, CHANGELOG `Changed`, decision amendment. Run `npm run bench` before/after — the get trap is the hottest path in the library; report the delta.

**Done when:** the repro updates to `"Z b"`; kernel stays ≤ 1.75 KB; bench regression (if any) is reported and judged acceptable.

### R5. `watch()` callback receives `(next, previous)`

- [ ] Status

**What:** Pass the previous delivered value as a second argument.

**Why:** Transition logic (`idle → loading`) is the main reason to use `watch()` over `effect()`, and today users must keep their own copy of the old value. Verified: callbacks receive exactly one argument.

**Semantics:**

- `immediate: true` (default): first call is `(current, undefined)`.
- `immediate: false`: first call skipped, but the current value becomes the baseline, so the first change delivers `(new, initial)`.
- `previous` is the last value **delivered** to this watcher, not every intermediate assignment (writes are coalesced per flush and inside `batch()`).
- Caveat: if the watched key holds a nested `state()` object mutated in place, `previous === next` (same object).
- One-argument callbacks keep working; no extra subscriptions.

**Where:** `src/addons/watch.js`, `src/addons/index.d.ts` (callback type), `docs/api/addons/watch.md`, `tests/addons/watch.test.js`.

**Artifacts:** tests (both immediate modes, batched writes, unsubscribe, one-arg compatibility), `.d.ts`, API docs, CHANGELOG `Added`.

### R6. `repeat()` head/tail trimming before LIS

- [ ] Status

**What:** Before building the position map and running the LIS, skip the common prefix and suffix of rows that did not move; run the minimal-move plan only on the middle.

**Why:** `reconcileDOM` (`src/addons/repeat.js:~405–440`) builds a `prevIndex` `Map` over *every* surviving row and runs LIS on every update. The most common updates — append, prepend, remove-one, edit-one — have long unchanged prefixes/suffixes and need no map at all. This is the standard trick in Vue/Regor/ivi keyed diffs.

**How:** After removing departed rows, walk `nextEls` and the container's element children from the start while they match, then from the end while they match (skipping the in-container source `<template>` — `keepEl`). Only the middle slice goes through `prevIndex` + `stableChainMarkers`. No API or ordering change.

**Where:** `src/addons/repeat.js`, `tests/addons/repeat.test.js` (spy on `insertBefore` to assert zero moves for append/prepend/remove-one, plus existing identity tests).

**Artifacts:** tests, CHANGELOG `Changed` (perf), dated note on the "minimal-move reordering" amendment under "Why No Virtual DOM?" in `design-decisions.md`. Keep function complexity ≤ 10 — extract a helper.

### R7. `stringAttr`: treat `data` as a URL attribute (low priority)

- [ ] Status

**What:** Add `data` (the `<object data>` URL) to `URI_ATTRS` in `src/handlers/stringAttr.js`.

**Why:** Defense in depth; Gea's sanitizer covers it, Lume's doesn't. Low priority: `data` is not in the `htmlAttrs()` preset, so it only matters for users who call `stringAttr('data')` explicitly. Confirm current browser behavior for `javascript:` in `<object data>` before writing the `@security` note. (`xlink:href` was considered and dropped: `data-xlink:href` is not a usable CSS-selector attribute name.)

**Artifacts:** test, `@security` doc note, CHANGELOG `Security`, short Hardening note in `design-decisions.md`.

---

## Phase 3 — Performance and DX in addons/handlers

### R8. `repeat()` O(1) selection option

- [ ] Status · **Decision gate**

**What:** An option such as `select: { key: 'selectedId', className: 'active' }` that keeps exactly one row marked as selected.

**Why:** "Highlight the selected row" is the canonical list update, and `VISION.md`'s performance table lists "List update (1 in 1000)" as Lume's worst gap (~50× Solid). Today it costs O(N): either every row re-checks `selectedId === item.id` or the user writes the bookkeeping by hand. Gea's `relationalClass` shows the right shape: one subscription on the selection key, toggle the class on the previous and next row via the existing key→element map — two DOM writes regardless of list size.

**How:** One `$subscribe(store, select.key)` inside `repeat()`; remember the previously selected key; on change, `classList.remove` on `elementsByKey.get(prev)` and `classList.add` on `elementsByKey.get(next)` (use `classList`, not `className =`, since rows have other classes). Newly created rows get the class if their key matches. Removed rows need no work. Unsubscribe in `repeat()`'s cleanup.

**Where:** `src/addons/repeat.js`, `src/addons/index.d.ts` (`RepeatOptions`), `docs/api/addons/repeat.md`, `docs/guides/lists.md`, tests, optionally an example (selection is visually demonstrable).

**Artifacts:** full "new public API" row of the matrix, including a decision entry (why an option on `repeat` rather than a separate addon — addons cannot import addons, and the key→element map lives inside `repeat`).

### R9. Delegated `on()` handler

- [ ] Status · **Decision gate** · needs design

**What:** Install one listener per event type instead of one per element, looking handlers up per element in a `WeakMap`.

**Why:** Fewer listeners on large pages, and it removes the documented caveat that `bindDom` cleanup does not detach `on()` listeners from elements that stay in the DOM (`src/handlers/on.js` doc comment). Lume already delegates two-way `input`.

**Design problems to solve first (this is why it is Phase 3):**

- The handler contract is `{ attr, apply(el, val) }` — `apply` has no access to the `bindDom` root. Options: a lazily installed document-level listener per event type (module state created on first `apply`, not at import — `sideEffects: false` stays intact), or extending the handler contract (bigger change).
- Non-bubbling events (`focus`, `blur`, `mouseenter`, `mouseleave`, `load`, `error`, `scroll`) need capture-phase listening or a per-element fallback.
- Semantics change: `event.currentTarget` differs and `stopPropagation()` in an inner native listener would now block Lume handlers. Either emulate `currentTarget` (Gea does) or document it.

**Artifacts:** decision entry is mandatory (observable event semantics change), tests per event category, docs, CHANGELOG. Measure benefit before merging — if it doesn't matter at realistic sizes, close it.

### R10. Lazy `computed()` (low priority; after R1)

- [ ] Status · **Decision gate**

**What:** Skip recomputation while nobody is subscribed; recompute on `.value` read when a dependency changed.

**Why:** Saves work for computeds that are rarely read. Honest limit: Lume's kernel delivers change notifications at flush time (microtask), not at write time, so a lazy computed **still cannot be read synchronously correct right after a write** without a kernel change. The benefit is therefore limited to skipping unused computations. Do it only if profiling shows unused computeds costing real time; otherwise close it.

---

## Phase 4 — Optional JSX authoring layer

### Why

JSX is what most developers already write. Lume's biggest adoption barrier is that its authoring model (HTML + `data-*` + `bindDom`/`repeat` wiring) feels unfamiliar and, per `VISION.md`'s open "Code Verbosity" challenge, can be *more* code than vanilla. An optional JSX entry lets React-trained developers write components immediately, while keeping everything that makes Lume trustworthy.

### Non-negotiable principles

- **Optional.** HTML + `data-*` remains the default and primary path. Core, `lume-js/state`, handlers, and addons never require a build. Nobody who skips JSX pays a byte for it (separate entries).
- **No compiler of our own.** TypeScript, esbuild, Vite, and Babel already compile JSX to function calls (`jsxImportSource`). Lume ships only the runtime those calls target. Gea's compiler is ~15k LOC — writing one would turn Lume into a weaker Solid.
- **Real DOM, no virtual DOM, no diffing, no re-render.** Components are plain functions that run **once** and return DOM nodes. Reactivity comes only from functions (`{() => store.count}`), exactly like the rest of Lume.
- **Same security posture.** Text via `textContent`, URL attributes through the same scheme filter as `stringAttr`, never `innerHTML`. Interpolated values are never parsed as HTML.
- **No component system / lifecycle hooks** beyond a cleanup scope (R12). "HTML is the component system" becomes "functions returning DOM are components".

### R11. Decision amendments (the gate — do this first)

- [ ] Status

**What:** Amend the ratified documents so the JSX layer is legal before any code lands:

- `design-decisions.md` "Why Standards-Only?" — the alternatives list rejects "JSX/Template literals → requires build step". Add a dated amendment: tagged template literals need no build at all (standard ES2015); JSX is acceptable as an **optional** separate entry because the core never requires it.
- `VISION.md` "Will NOT Add": "Build step requirement" stays banned (unchanged — JSX is opt-in). Clarify "Component system" (functions returning DOM are not a component system: no instances, no lifecycle, no re-render).
- `AGENTS.md` hard constraints: scope "No custom syntax beyond `data-*`" to HTML markup; add the dependency direction for the new layer (proposed: JSX/html modules may import core and `utils/`, not addons or handlers). To share the URL filter, move it from `src/handlers/stringAttr.js` to `src/utils/` and widen "handlers import nothing (or `utils/log.js`)" to "(or `utils/*`)".
- New size budgets for the new entries in `scripts/check-size.js` and the `AGENTS.md` table (proposal: `jsx-runtime` + `html` combined ≤ 1.5 KB gz). Existing budgets do not move.

**Artifacts:** docs only, one commit, `docs(design):`.

### R12. Owner scope for JSX-created reactivity

- [ ] Status

**What:** A cleanup scope so a rendered JSX tree can be disposed with one call, e.g. `const dispose = render(() => <App />, el)`.

**Why:** Every reactive prop/child in JSX creates an `effect()`. Without an owner, removing a subtree leaks its effects — the problem Gea solves with a `Disposer` tree and Regor with unbinders. This is the hard part of the JSX layer; build it first.

**How:** The JSX runtime creates its own effects for reactive props/children, so it can register them with the current owner without touching `src/core/effect.js`. A reactive child region (a function child that returns nodes) gets a child owner that is disposed and recreated when it re-runs. User-created `effect()` calls inside components are **not** auto-owned in v1; expose an explicit `onCleanup(fn)` from the JSX module for that. Making core `effect()` owner-aware is a separate, later decision (kernel bytes).

**Done when:** rendering and disposing a tree 100 times returns subscriber counts to baseline (assert via a counting store or spies).

### R13. `lume-js/jsx-runtime`

- [ ] Status

**What:** `jsx`, `jsxs`, `Fragment` (+ `jsx-dev-runtime` re-export), used via `"jsx": "react-jsx", "jsxImportSource": "lume-js"`.

**Semantics (v1):**

- Intrinsic tag → `document.createElement` (SVG subtree → `createElementNS`).
- Function tag → call it once with props; it returns a Node.
- `on<Event>={fn}` → event listener (delegated if R9 lands).
- Function-valued prop (non-event) → reactive via an owned `effect()`.
- Children: string/number → text node; Node → append; array → flatten; `null`/`false`/`true` → nothing; **function → reactive region** (anchor comment + owned effect; re-renders that region's nodes when its deps change).
- `data-*` string props pass through untouched, so `bindDom` can bind JSX output and mixed authoring works.
- `ref={el => ...}` callback for imperative access.
- URL attributes go through the shared scheme filter; text always via `textContent`/text nodes.

**Biggest footgun to document loudly:** components run once. `{store.count}` is a static snapshot; `{() => store.count}` is reactive. React developers will hit this first (Solid has the same rule).

**Lists in JSX:** a function child returning `items.map(...)` rebuilds every row. v1 answer: use `repeat()` through `ref`, and leave a keyed JSX list helper as an open question (it would need the JSX layer to import an addon, which R11's dependency rule must allow or forbid).

**Where:** `src/jsx/` (or `src/jsx-runtime.js`), handwritten `src/jsx-runtime.d.ts` with the `JSX` namespace (`IntrinsicElements`, `Element = Node`), `package.json` `exports` for `./jsx-runtime` and `./jsx-dev-runtime`, `scripts/build.js` entries, `scripts/check-size.js` budget.

**Artifacts:** full "new public API" row: tests (jsdom), `.d.ts`, API docs + `docs/README.md` link (via `docs/manifest.json`), CHANGELOG, decision entry (covered by R11 + a specific entry for runtime semantics), example, README.

### R14. `lume-js/html` tagged template

- [ ] Status

**What:** `` html`<button onclick=${inc}>${() => store.count}</button>` `` — the **no-build twin** of JSX, built on the same `h()` core as R13.

**Why:** Gives JSX-like authoring to users who refuse a build step (Lume's core audience) and directly attacks the Code Verbosity challenge. `VISION.md`'s brainstorm seeds already list template literals.

**How:** Parse each template's static strings once (cache by the `TemplateStringsArray` identity in a `WeakMap`), turn them into `h()` calls (the `htm` approach, ~0.5 KB). Interpolations are only ever used as attribute values, props, or child values — **never concatenated into markup and parsed as HTML**, so it is safe by construction (unlike Regor's `html`, which is plain string concatenation).

**Artifacts:** same as R13; shares its tests for semantics, adds parser tests (attributes, self-closing, fragments, nested templates, SVG, malformed input errors).

### R15. Docs, types, examples, budgets for the JSX layer

- [ ] Status

- Guides: `docs/guides/jsx.md` (setup for Vite/esbuild/TS, the run-once rule, reactivity via functions, cleanup) and `docs/guides/html-templates.md`; register both in `docs/manifest.json`, then `npm run docs:sync`.
- Examples: `examples/jsx-todo/` (Vite) and `examples/html-todo/` (no build, plain `<script type="module">`), cards in `examples/index.html`.
- README: "HTML-first, JSX-optional" plus one example shown both ways.
- `AGENT_GUIDE.md`: rules for agents generating Lume JSX (run-once, function children, cleanup). Regenerate `llms.txt`/`llms-full.txt` (`npm run llms`).

### Open questions for Phase 4

- Should the JSX layer be allowed to import `repeat()` to offer a keyed list component? (Dependency-rule decision in R11.)
- Should core `effect()` become owner-aware so user effects inside components are auto-disposed? (Costs kernel bytes; decide after R12 ships.)
- SSR: render JSX to a string on the server? Out of scope for v1; note in the decision entry.

---

## Phase 5 — Docs and positioning

### R16. Security guide

- [ ] Status

**What:** `docs/guides/security.md` stating Lume's guarantees: attributes hold state **paths, never expressions** (so markup an attacker controls cannot execute code — unlike expression-evaluating template libraries); URL scheme filtering on bound URL attributes (including control-character evasion); `textContent` only; prototype-key write guard; subscriber cap; the trust model of `data-*` injection (can only reach existing state).

**Why:** This is Lume's most defensible difference and nobody can see it today. Both reviewed competitors fail at least one of these.

### R17. `VISION.md` cleanup and tagline

- [ ] Status

- Mark "Optional Build Step (Future Idea)" (the Babel pass turning auto-tracked effects into explicit deps) as **superseded**: since v2.3, effects reuse their subscriptions and allocate nothing on stable re-runs (decision "Why Effects Reuse Their Subscriptions Across Runs"), so the pass would buy almost nothing. Point to Phase 4 instead.
- Refresh the stale "Do Now" table (several items are long done).
- Adopt the tagline **"HTML-first, JSX-optional."** once R13/R14 ship.

### R18. Re-measure the Code Verbosity challenge

- [ ] Status

After Phase 4, rebuild the debug-demo comparison (vanilla vs Lume HTML vs Lume JSX vs Lume `html`) and update the table in `VISION.md`. Close the challenge only if Lume's line count beats vanilla.

---

## Rejected — do not re-propose without new evidence

| Idea | Seen in | Why rejected |
|---|---|---|
| Our own JSX compiler | Gea | ~15k LOC, becomes a weaker Solid; the JSX runtime (R13) gets the adoption benefit without it |
| Virtual DOM / re-rendering components | — | Contradicts "Why No Virtual DOM?"; components run once |
| Expressions in attributes (`{{ }}`, `:attr="a + b"`) | Regor | Template-injection class of bugs; `AGENTS.md` hard constraint |
| Automatic deep reactivity / intercepted array methods | Gea, Regor | Ratified "nested state must be explicit"; Gea stamps symbols on user objects, Regor rewrites them in place |
| Synchronous flushing | Regor | Exposes intermediate states; microtask coalescing is ratified |
| "Lock" tracking after stable runs | Gea | Unsound — conditional deps go stale; Lume's run-generation sweep already gives zero-alloc steady state safely |
| Synchronous "direct observers" bypassing batching | Gea | Benchmark-specific special case; R8 gets the O(1) result without breaking batching |
| Global scheduler | Gea | Ratified against ("Why Per-State Batching"); Gea's shared flush loop shows the freeze hazard |
| Non-escaping `html` tag | Regor | R14 must be safe by construction |
| MutationObserver-based auto-cleanup | external suggestion | Global machinery, fuzzy ownership; Lume cleans what it owns |

## Already done — don't rebuild

| Proposed as new | Where it already lives |
|---|---|
| Dependency-tracked `computed()` with `Object.is` dedupe, conditional deps, disposal | `src/addons/computed.js` (built on `effect()` auto-tracking) |
| Keyed, DOM-stable `repeat()` with minimal moves | `src/addons/repeat.js`; amendment "minimal-move reordering" under "Why No Virtual DOM?"; identity tests `tests/addons/repeat.test.js:1223` |
| Idempotent disposers / cleanup on removal | `$subscribe` unsubscribe index guard (`src/core/state.js`), `computed.dispose()`, `repeat()` `create()`-returned cleanup |
| Effects that don't re-subscribe on stable runs | `src/core/effect.js`; decision "Why Effects Reuse Their Subscriptions Across Runs" |
| Cross-store batching | `src/core/batch.js` |
| URL scheme filtering | `src/handlers/stringAttr.js` |
