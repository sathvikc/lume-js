# Lume.js Roadmap

> **Purpose:** The open backlog — what is left to build or decide, in what order, and *why*. Every item says what it is, why it matters, where it lives in the code, how to approach it, what artifacts it needs, and when it counts as done. A new session should be able to pick up any item from this file alone.  
> **Updated:** 2026-10-28 · **Baseline:** `main` @ 762bbe3 · v2.4.0 · 506 tests · 100% coverage  
> **Status:** Living document that holds **only open work**. Shipped work lives in git history and `CHANGELOG.md`; ideas that were measured away or rejected are one-liners in [Don't propose again](#dont-propose-again-without-new-evidence). When an item ships, delete its section and its overview row.

---

## How to use this document

1. Read `AGENTS.md` (process contract), then `docs/design/design-decisions.md` (ratified decisions), then this file. `VISION.md` owns direction and philosophy; this file owns the concrete backlog. `VISION.md` still lists longer-term ideas ("Do Later": spaMode for `bindDom`, framework adapters, a form validation addon); they become items here only once someone verifies a concrete need.
2. Start with [Decisions needed](#decisions-needed-from-the-maintainer): several items are blocked on them, and R27 (the global bundle budget) blocks every item that adds bytes.
3. Each item lists the artifacts `AGENTS.md`'s matrix requires. Items marked **Decision gate** must land their `design-decisions.md` entry or amendment *before or with* the code — the ratified entry wins until it is amended.
4. One item = one commit (or one proposal branch for large ones), carrying all its artifacts; all five quality gates must pass. Implement on a branch other than the one holding this file, and never copy this file into it. Commit messages, decision entries and docs describe each change in their own words, with no references to this file or to item IDs, because this file changes. When an item ships, remove it from this file on this file's own branch.
5. Any item touching code must report its gzip size delta in the commit body; see [Size budgets](#size-budgets-the-binding-constraint).

## Rules for writing or updating items

These come from mistakes made while building the first version of this roadmap (2026-10-21 to 2026-10-28). Every one of them was learned the hard way.

1. **Tag every claim** as *executed* (with the command or repro) or *reasoned*. Never mix the two at the same confidence.
2. **A proposed fix gets a prototype before it goes under "How".** Otherwise label it "direction, unverified". (A suggested retry-based fix for a `computed()` bug would have looped forever on non-converging computeds.)
3. **Performance items carry a measured baseline from Lume itself**, not "library X does this". (Three perf items were closed after a five-minute measurement.)
4. **Report every size budget** and name the one closest to its limit.
5. **Specify warning and error behavior** for every edge state an item introduces (null, missing key, wrong type).
6. **Re-run repros in every call order and input sequence** where ordering can matter, and write the exact sequence into the repro.
7. **When a change replaces existing behavior, probe what the old code accepted, not just what the new spec lists.** For path handling that means at least: a flat key, a nested `state()`, a plain object mid-path, an array index mid-path, `null`, and a missing key, each on `main` before and on the branch after. (The nested-path rewrite broke `list.0.name` and `cfg.user.name`; two reviews missed it.)
8. **"Not documented" is a claim like any other:** read the relevant section before asserting it. A keyword search proves presence, never absence. (A "documentation gap" was reported for text that had existed since the feature's first commit.)

---

## Size budgets: the binding constraint

Executed 2026-10-28 on `main` (`npm run size`; percentages are from exact bytes, not the rounded KB):

| Entry | Size (gz) | Budget | Used | Headroom |
|---|---|---|---|---|
| `lume.global.js` (CDN all-in-one) | 7.96 KB | 8.00 KB | **99.5%** | **0.04 KB** |
| `index.min.mjs` (core) | 2.90 KB | 3.00 KB | 96.6% | 0.10 KB |
| `state.min.mjs` (kernel) | 1.49 KB | 1.75 KB | 85.0% | 0.26 KB |
| `addons.min.mjs` | 5.03 KB | 6.00 KB | 83.9% | 0.97 KB |
| `handlers.min.mjs` | 1.23 KB | 2.00 KB | 61.4% | 0.77 KB |

Every byte added to core, addons or handlers also lands in `lume.global.js`, which re-exports everything. With 0.04 KB left, **no feature that adds code can ship until R27 is decided**. Budgets live in `scripts/check-size.js` (`BUDGETS`); `docs/metrics.json` deliberately omits the global budget in code, with no stated reason (R28).

---

## Overview

| ID | Item | Type (AGENTS matrix) | Decision gate | Blocked by | Status |
|---|---|---|---|---|---|
| R27 | Decide the global bundle budget policy | Decision + tooling | **Is the gate** | — | ⏳ needs maintainer decision |
| R26 | Decide whether `list.0.name` index paths are supported | Decision (+ docs) | **Yes** | R27, only for the warning-text fix | ⏳ needs maintainer decision |
| R11 | Decision amendments for the optional JSX layer | Docs (decision) | **Is the gate** | R27 (where new entries live) | ⏳ needs maintainer decision |
| R28 | Put the global budget in `docs/metrics.json` | Build / tooling | No | — | ☐ ready |
| R21 | `repeat()` delegated row `on` option | New public API (option) | **Yes** | R27 | ⏸ blocked on budget |
| R4 | Reactive getters on state objects | Behavior change (kernel) | **Yes** | a viable design, R27 | ⏸ deferred |
| R22 | Async-data helper | New public API | **Yes** | demand evidence, R27, a `VISION.md` amendment | ⏸ candidate only |
| R12 | Owner scope for JSX-created reactivity | New public API | via R11 | R11 | ⏳ waiting on R11 |
| R13 | `lume-js/jsx-runtime` | New public API + entry | via R11 | R11, R12 | ⏳ waiting on R11 |
| R14 | `lume-js/html` tagged template | New public API + entry | via R11 | R13 | ⏳ waiting on R11 |
| R15 | JSX/html docs, types, examples, budgets | Docs / tooling | — | R13, R14 | ⏳ waiting on R11 |
| R17 | Adopt the "HTML-first, JSX-optional" tagline | Docs | No | R13, R14 shipped | ⏳ blocked |
| R18 | Re-measure the Code Verbosity challenge | Docs | No | R13, R14 shipped | ⏳ blocked |

---

## Decisions needed from the maintainer

These are product calls, not implementation steps. An agent should prepare the options and evidence, not pick one.

### R27. Decide the global bundle budget policy

- [ ] Status: **needs a decision.** Blocks R21, R22 and any other byte-adding item; R11 must also say where the JSX entries live.

**What:** `lume.global.js` (the CDN all-in-one IIFE, `src/all.js`) is at 7.96 / 8.00 KB because it re-exports every core, addon and handler module. Decide how it grows.

**Why:** It is now the binding constraint for the whole library, ahead of the `index` and kernel budgets that `AGENTS.md` guards most closely. The last two features (`repeat()`'s `select` option and the plain-object path fix) took it from 7.84 to 7.96 KB. Without a policy, every future item stalls on 0.04 KB.

**Options:**

1. **Raise the global budget deliberately** (for example to 8.5 or 9 KB), with a dated decision entry explaining why. Cheapest; keeps "everything in one script tag".
2. **Freeze the global bundle's contents:** new addons ship only as separate CDN entries (`addons.min.mjs` has 0.97 KB headroom) and `src/all.js` stops re-exporting new modules. Keeps 8 KB honest, but the all-in-one stops being "all".
3. **Both:** a small raise now, plus the rule that optional layers (JSX runtime, `html` tag, future addons) never enter the global bundle.

**Recommendation:** option 3. CDN users are the no-build audience; the JSX layer is for build users and does not belong in the IIFE. A modest raise unblocks R21-sized items without opening the door to unlimited growth.

**Artifacts:** decision entry, `scripts/check-size.js` `BUDGETS` change (if raising), `AGENTS.md` budget table, README size claims if they mention the global bundle.

### R26. Decide whether `list.0.name` index paths are a supported pattern

- [ ] Status: **needs a decision.**

**What:** `data-bind="list.0.name"` (an array index inside a path) works on `main`, but no decision entry ever weighed it.

**History (executed 2026-10-28 with full git history):** it has worked by accident since the very first commit (74fffef, 2025-10-03: `bindDom` already walked a path with `for (const key of path) target = target[key]`; arrays are objects whose indexes are keys; 91d7815 the same evening moved the walk into `resolvePath`). No test, doc or CHANGELOG entry mentioned a numeric path segment until 942863a (2026-10-26), which restored the behavior after the nested-path rewrite (8d93add) had broken it, added regression tests, and documented `list.0.name` by name in `docs/api/core/bindDom.md` and `CHANGELOG.md`. The nested-path decision entry covers it only generically ("plain objects and arrays in the middle of a path are stepped through"); `list.0.name` appears nowhere in `design-decisions.md`. "Why Nested State for Multiple Checkboxes Instead of Arrays?" rejects binding checkboxes to an *array value* (two-way array membership), not reading through an index; its spirit and the lists guide's "never array index" for keys both lean against positional bindings.

**Behavior on `main` (executed; `state({ list: [state({ name: 'A' }), state({ name: 'B' })] })`, `<span data-bind="list.0.name">`):**

| Action | Result |
|---|---|
| Initial render; edit `list[0].name` | renders `A`, then updates |
| `store.list.reverse()` (in place) | **stale**: shows the old item's name while `list[0]` is the other item; the array is a plain step and is not watched |
| `store.list = [...store.list]` | re-links |
| `store.list = []` | renders empty, but warns `Path "list.0.name" is not reactive at "0"`, which misdescribes a missing index |

**Options:**

1. **Support it, with the limits written down:** the binding follows the index, not the item; in-place array changes are not seen; replace the array to re-link; prefer `repeat()` for lists. Fix the missing-index warning text.
2. **Keep it but discourage it:** document "works, not recommended" and point to `repeat()` or a keyed nested `state()`. Removing it is not recommended: it has worked since the first commit and is now documented, so removing it would be a breaking change. (Note: the regression and its fix landed on `main` together, after the v2.4.0 tag, so no released version ever broke it; there is no evidence yet of how many users rely on it.)

**Recommendation:** option 1, as a dated amendment to the nested-path decision entry plus one paragraph in `docs/api/core/bindDom.md`. The warning-text fix needs a byte check against the global budget (R27).

**Artifacts:** decision amendment, API doc paragraph, a test asserting the in-place-reorder limit, CHANGELOG if the warning text changes.

### R11. Decision amendments for the optional JSX layer

- [ ] Status: **needs a decision.** This is the gate for R12–R15, R17 and R18.

**What:** Amend the ratified documents so an optional JSX layer is legal before any code lands. As of `main` @ 762bbe3, `design-decisions.md` `Why "Standards-Only"?` still lists "❌ JSX/Template literals → Requires build step, breaks progressive enhancement", and `VISION.md` "Will NOT Add" still lists a component system.

**Why:** JSX is what most developers already write. Lume's adoption barrier is that its authoring model (HTML + `data-*` + `bindDom`/`repeat` wiring) feels unfamiliar and, per `VISION.md`'s open "Code Verbosity" challenge, can be more code than vanilla. An optional JSX entry lets React-trained developers start immediately while keeping what makes Lume trustworthy.

**What the amendment must say:**

- `design-decisions.md` `Why "Standards-Only"?`: a dated amendment. Tagged template literals need no build at all (standard ES2015); JSX is acceptable as an **optional, separate entry** because core never requires it.
- `VISION.md`, everywhere the JSX layer conflicts with it (verified on `main` @ 762bbe3):
  - "Will NOT Add": "Build step requirement" stays banned (JSX is opt-in). Clarify "Component system": functions returning DOM are not a component system (no instances, no lifecycle, no re-render). Clarify "Lifecycle hooks": R12's cleanup scope and `onCleanup` are disposal, not mount/update hooks.
  - "❌ Skip Entirely" also lists "Component system" ("Scope creep. HTML + web components exist."); amend it the same way.
  - The Code Verbosity challenge's "The Constraint" block says "We cannot: ❌ Add build step / ❌ Add custom syntax beyond `data-*`"; amend it to say optional entries for build users are allowed and core stays build-free.
- `AGENTS.md` hard constraints: scope "No custom syntax beyond `data-*`" to HTML markup; add the dependency direction for the new layer (proposed: JSX/html modules may import core and `utils/`, not addons or handlers). To share the URL filter, move it from `src/handlers/stringAttr.js` to `src/utils/` and widen "handlers import nothing (or `utils/log.js`)" to "(or `utils/*`)".
- Budgets: new entries in `scripts/check-size.js` and the `AGENTS.md` table (proposal: `jsx-runtime` + `html` combined ≤ 1.5 KB gz), and, per R27, a statement that they are **not** part of `lume.global.js`.

**Artifacts:** docs only, one commit, `docs(design):`.

---

## Ready to do

### R28. Put the global budget in `docs/metrics.json`

- [ ] Status: **ready.** Zero bundle bytes.

**What:** `scripts/build-metrics.js` builds `docs/metrics.json` from `scripts/check-size.js`'s `BUDGETS`, but skips the global entry on purpose (`if (key !== 'global' && ...)`), with no comment saying why. So `metrics.json` lists the global **size** (7.96) but not its **budget** (8.00).

**Why:** `metrics.json` is the single source for size facts in README, agent docs and guides. The one budget that is now binding is the one it hides, which is how the first version of this roadmap overlooked it (it listed four budgets and missed the global one, then at 7.75 / 8.00).

**How:** remove the `key !== 'global'` exclusion (or, if it exists because no doc renders the value, keep it and add a comment saying so), regenerate with `npm run docs:metrics`, and check that `npm run docs:check` passes.

**Artifacts:** Build/tooling row of the matrix; no `src/` change.

---

## Deferred and candidate items

### R21. `repeat()` delegated row `on` option

- [ ] Status: **blocked on R27** (needs bytes in the global bundle).

**What:** `on: { click: (event, item, index, el) => ... }`: one listener per event type on the container, resolving the row from `event.target` and passing the **current** item and index.

**Why:** A listener added in `create()` closes over the row's **first** item. Executed: after an immutable update the row shows `new` while its click handler reads `old`. `docs/api/addons/repeat.md` now warns about this (df5ecf4), but a warning is a trap users must know about; this option removes the trap. Modeled on Velotype's `RenderTemplateArray` `on` option [traced]. It is a correctness/DX item, not a performance one: per-element listener cost was measured as noise (10,000 listeners: 1.5 ms in Chrome).

**Open design points:** bubbling events only (document it); which element counts as the row when rows nest; interaction with `stopPropagation()` inside rows; byte cost measured before building.

**Artifacts:** full "new public API" row, including a decision entry.

### R4. Reactive getters on state objects

- [ ] Status: **deferred.** A prototype was built, measured and reverted on 2026-10-26.

**What:** Make `get` accessors on state objects auto-tracked inside `effect()`/`computed()`. Today they silently never update (executed):

```js
const s = state({ first: 'a', last: 'b', get full() { return this.first + ' ' + this.last; } });
effect(() => seen = s.full);
s.first = 'Z';   // seen stays "a b"
```

The `get` trap reads `target[key]` (`src/core/state.js`), so the getter runs with `this` = the raw object and its reads bypass the Proxy.

**Why the simple fix was rejected (all executed):** `Reflect.get(target, key, proxy)` made raw proxy reads ~40% slower (`state-read (100k reads)` 1.04–1.09 ms → 1.47–1.56 ms, three `npm run bench` runs each way); it breaks class getters that read `#private` fields (`TypeError: Cannot read private member`) once `this` is the proxy. Class instances work with `state()` today (executed), and `docs/api/core/state.md`'s "What's not reactive" table marks them "Partial", though line 13 of the same page says the initial value must not be a class instance; the page contradicts itself, but breaking a pattern that works today is a regression either way; and getters would still be dead in `data-bind`, `watch()` and `$subscribe`, because nothing ever writes the getter key.

**Viable shape for a retry:** detect accessor keys once in `state()` (`Object.getOwnPropertyDescriptors`) for plain object literals only, so getter-less stores pay nothing on reads and class instances are untouched; **plus** a getter-aware `bindDom` path (for example, binding getter keys through `effect()`), costed together against the `index` budget (0.10 KB left) and R27.

### R22. Async-data helper (candidate only)

- [ ] Status: **candidate; do not build without demand evidence and an R27 decision.**

**What:** A helper that drives a store through `pending` / `resolved` / `rejected` for a `fetch`-style source, where only the newest load wins and older loads are aborted, so markup can bind `data-show="status"` and similar.

**Why it is here:** Lume has nothing like it (executed: no `AbortController`/`AbortSignal` anywhere in `src/`); Velotype's `AsyncRenderObject` covers exactly this [traced]. **Why it is not scheduled:** no evidence users need it in the library rather than in a few lines of app code, and its bytes would land in the global bundle. It also conflicts with ratified direction: `VISION.md` "❌ Skip Entirely" lists "Built-in HTTP/fetch — Not related to reactivity". Building it needs a `VISION.md` amendment arguing it is about async **state**, not HTTP. Reopen with concrete demand (issues, examples that hand-roll it) and a measured byte cost.

---

## The optional JSX layer (after R11)

### Non-negotiable principles

- **Optional.** HTML + `data-*` remains the default and primary path. Core, `lume-js/state`, handlers and addons never require a build. Nobody who skips JSX pays a byte for it (separate entries, not in `lume.global.js`).
- **No compiler of our own.** TypeScript, esbuild, Vite and Babel already compile JSX to function calls (`jsxImportSource`). Lume ships only the runtime those calls target. Gea's compiler alone is ~15k LOC; writing one would turn Lume into a weaker Solid.
- **Real DOM, no virtual DOM, no diffing, no re-render.** Components are plain functions that run **once** and return DOM nodes. Reactivity comes only from functions (`{() => store.count}`), exactly like the rest of Lume. Velotype shows the alternative: without auto-tracking, every reactive value needs a wrapper object and updates fall back to replacing elements, losing input state and focus [traced].
- **Same security posture.** Text via `textContent`, URL attributes through the same scheme filter as `stringAttr`, never `innerHTML`. Interpolated values are never parsed as HTML.
- **No component system or lifecycle hooks** beyond a cleanup scope (R12).

### R12. Owner scope for JSX-created reactivity

- [ ] Status: waiting on R11.

**What:** A cleanup scope so a rendered JSX tree can be disposed with one call, for example `const dispose = render(() => <App />, el)`.

**Why:** Every reactive prop or child in JSX creates an `effect()`. Without an owner, removing a subtree leaks its effects. This is the hard part of the JSX layer (in Velotype, roughly a quarter of the source is lifecycle and ownership bookkeeping [traced]); build it first.

**How:** The JSX runtime creates its own effects for reactive props and children, so it can register them with the current owner without touching `src/core/effect.js`. A reactive child region (a function child that returns nodes) gets a child owner that is disposed and recreated when it re-runs. User-created `effect()` calls inside components are **not** auto-owned in v1; expose an explicit `onCleanup(fn)` from the JSX module. Making core `effect()` owner-aware is a separate, later decision (kernel bytes).

- **Own scopes through closures, not a global id registry.** Velotype's registry is only correct when every removal goes through the library; an element removed with plain `el.remove()` appears to leave its entry behind [traced, not proven].
- **Consider exposing an `AbortSignal` per scope** (Velotype's `unmountSignal`) for `fetch(url, { signal })`. Browser-floor caveat [reasoned from MDN, verify before relying on it]: `AbortController` and `fetch` signals fit the Chrome 80 / Safari 13.1 floor, but `addEventListener`'s `{ signal }` option needs Chrome 90 / Safari 15, so docs must not recommend it while the floor stays.

**Done when:** rendering and disposing a tree 100 times returns subscriber counts to baseline (assert via a counting store or spies).

### R13. `lume-js/jsx-runtime`

- [ ] Status: waiting on R11 and R12.

**What:** `jsx`, `jsxs`, `Fragment` (plus a `jsx-dev-runtime` re-export), used via `"jsx": "react-jsx", "jsxImportSource": "lume-js"`.

**Semantics (v1):**

- Intrinsic tag → `document.createElement` (SVG subtree → `createElementNS`).
- Function tag → call it once with props; it returns a Node.
- `on<Event>={fn}` → event listener.
- Function-valued prop (non-event) → reactive via an owned `effect()`.
- Children: string/number → text node; Node → append; array → flatten; `null`/`false`/`true` → nothing; **function → reactive region** (anchor comment + owned effect; re-renders that region's nodes when its dependencies change).
- `data-*` string props pass through untouched, so `bindDom` can bind JSX output and mixed authoring works.
- `ref={el => ...}` callback for imperative access.
- URL attributes go through the shared scheme filter; text always via `textContent` or text nodes.
- **Property-vs-attribute policy:** decide explicitly which props are set as DOM properties. Never set HTML-injecting properties from props: deny at least `innerHTML`, `outerHTML` and `srcdoc`. Apply the URL scheme filter on the **property** path too (`el.href = ...`), not only on `setAttribute`. Rationale: Velotype sets any prop whose name has a setter on the prototype chain, which turns `<div {...untrustedProps}>` into HTML injection [setter premise executed in jsdom; Velotype path traced]. Tests must cover spread props carrying these names.
- **Rollback on a throwing render:** when a reactive region's function child throws, keep the region's current nodes, dispose whatever the failed run created, then report the error (Velotype does this [traced]).

**Biggest footgun to document loudly:** components run once. `{store.count}` is a static snapshot; `{() => store.count}` is reactive. React developers will hit this first (Solid has the same rule).

**Lists in JSX:** a function child returning `items.map(...)` rebuilds every row. v1 answer: use `repeat()` through `ref`, and leave a keyed JSX list helper as an open question (it would need the JSX layer to import an addon, which R11's dependency rule must allow or forbid).

**Where:** `src/jsx/` (or `src/jsx-runtime.js`), a handwritten `src/jsx-runtime.d.ts` with the `JSX` namespace (`IntrinsicElements`, `Element = Node`), `package.json` `exports` for `./jsx-runtime` and `./jsx-dev-runtime`, `scripts/build.js` entries, a `scripts/check-size.js` budget.

**Artifacts:** full "new public API" row: tests (jsdom plus the Chromium smoke suite), `.d.ts`, API docs and a `docs/manifest.json` entry, CHANGELOG, a decision entry for runtime semantics, an example, README.

### R14. `lume-js/html` tagged template

- [ ] Status: waiting on R11 and R13.

**What:** `` html`<button onclick=${inc}>${() => store.count}</button>` ``, the **no-build twin** of JSX, built on the same `h()` core as R13.

**Why:** Gives JSX-like authoring to users who refuse a build step (Lume's core audience) and directly attacks the Code Verbosity challenge. `VISION.md`'s brainstorm seeds already list template literals.

**How:** Parse each template's static strings once (cache by the `TemplateStringsArray` identity in a `WeakMap`) and turn them into `h()` calls (the `htm` approach, ~0.5 KB). Interpolations are only ever used as attribute values, props or child values — **never concatenated into markup and parsed as HTML**, so it is safe by construction (unlike Regor's `html`, which is plain string concatenation).

**Artifacts:** same as R13; shares its semantic tests and adds parser tests (attributes, self-closing tags, fragments, nested templates, SVG, malformed input errors).

### R15. Docs, types, examples and budgets for the JSX layer

- [ ] Status: waiting on R13 and R14.

- Guides: `docs/guides/jsx.md` (setup for Vite/esbuild/TS, the run-once rule, reactivity via functions, cleanup) and `docs/guides/html-templates.md`; register both in `docs/manifest.json`, then `npm run docs:sync`.
- Examples: `examples/jsx-todo/` (Vite) and `examples/html-todo/` (no build, plain `<script type="module">`), with cards in `examples/index.html`.
- README: one example shown both ways (HTML + `data-*`, and JSX).
- `AGENT_GUIDE.md`: rules for agents generating Lume JSX (run-once, function children, cleanup). Regenerate `llms.txt`/`llms-full.txt` (`npm run llms`).

### R17. Adopt the "HTML-first, JSX-optional" tagline

- [ ] Status: blocked until R13 and R14 ship. (The rest of the original `VISION.md` cleanup is done.)

Adopt it in README and `VISION.md` only when the layer it describes exists.

### R18. Re-measure the Code Verbosity challenge

- [ ] Status: blocked until R13 and R14 ship.

Rebuild the debug-demo comparison (vanilla vs Lume HTML vs Lume JSX vs Lume `html`) and update the table in `VISION.md`. Close the challenge only if Lume's line count beats vanilla.

### Open questions for the JSX layer

- Should the JSX layer be allowed to import `repeat()` to offer a keyed list component? (Dependency-rule decision in R11.)
- Should core `effect()` become owner-aware so user effects inside components are auto-disposed? (Costs kernel bytes; decide after R12 ships.)
- SSR: render JSX to a string on the server? Out of scope for v1; note it in the decision entry.

---

## Background: what the competitor reviews taught

Code-level reviews (source read, not READMEs) done 2026-10-20 to 2026-10-27. They are summarized here because they explain the open items and the "don't propose again" list.

- **Gea** (`dashersw/gea` @ `51da237`): compiler-first JSX framework with a Proxy store; ~15–20% overlap with Lume. Gave Lume the O(1) row-selection idea (now `repeat()`'s `select`) and the `data` URL attribute in the scheme filter. Taught what to avoid: tracking that stops after "stable" runs (conditional deps go stale), one throwing observer freezing other stores, `silent()` dropping earlier writes, no prototype-key guard, unsanitized compiled `href`.
- **Regor** (`PureStackStudio/Regor` @ `2203462`): petite-vue-style, binds existing HTML with custom directives and a JS expression evaluator; ~35–40% overlap. Inspired `data-bind-scope` (its `r-pre`) and the security guide (its evaluator reaches `Function` through `constructor`, which Lume's "paths, never expressions" rule makes impossible). Taught what to avoid: expressions in markup, a non-escaping `html` tag, synchronous flushing, rewriting user objects in place.
- **Velotype** (`Velotype/velotype` @ `49c54ff`): a JSX runtime with no virtual DOM and no automatic reactivity; ~15% overlap, but a shipped example of the layer R11–R15 plan. Its lessons are in R12, R13, R21 and R22; it also prompted the `create()` closure warning and the Chromium smoke tests now on `main`.

---

## Don't propose again without new evidence

Each line was either measured away, rejected for a stated reason, or already exists. Reopen only with new evidence, and say what changed.

| Idea | Why not | Evidence |
|---|---|---|
| `repeat()` head/tail trimming before the LIS | Common updates (append, prepend, remove-one, edit-one) already make the minimum DOM moves; the skippable JS work is 0.03 ms at 1,000 rows | Measured 2026-10-26; reopen only with a profile of a real 10k+ row list |
| Delegated (document-level) `on()` handler for performance | 10,000 `addEventListener` calls cost 1.5 ms; `bindDom` over 10k `data-onclick` vs 10k `data-hidden` buttons: 26.8 vs 26.0 ms. Would change `currentTarget`/`stopPropagation()` behavior for nothing | Measured in Chrome 2026-10-26. (R21 is a different, correctness-driven idea scoped to `repeat()`.) |
| Lazy `computed()` | Its own precondition (a profile showing unused computeds costing real time) was never met; and the kernel notifies at flush time, so a lazy computed still cannot be read synchronously correct after a write | Closed 2026-10-26 |
| Our own JSX compiler | ~15k LOC in Gea; becomes a weaker Solid. A runtime for the existing JSX transform (R13) gets the adoption benefit | Gea review |
| Virtual DOM / re-rendering components / replacing elements to update | Contradicts "Why No Virtual DOM?"; loses input state and focus; Velotype's `refresh()` rebuilds whole subtrees | Gea and Velotype reviews |
| Expressions in attributes (`{{ }}`, `:attr="a + b"`) | Template-injection class of bugs; `AGENTS.md` hard constraint | Regor review |
| Automatic deep reactivity / intercepted array methods | Ratified "nested state must be explicit"; Gea stamps symbols on user objects, Regor rewrites them in place | Gea and Regor reviews |
| Synchronous flushing / re-render on every write | Exposes intermediate states and re-renders once per write; microtask coalescing is ratified | Regor and Velotype reviews |
| Tracking that "locks" after stable runs | Unsound: conditional deps go stale. Lume's run-generation sweep already gives a zero-allocation steady state safely | Gea review |
| Synchronous "direct observers" that bypass batching | A benchmark-specific special case; `select` got O(1) without breaking batching | Gea review |
| Global scheduler | Ratified against ("Why Per-State Batching"); Gea's shared flush loop shows the freeze hazard | Gea review |
| Setting any prop that has a DOM setter (incl. `innerHTML`); unfiltered `href` | HTML injection through spread props; `javascript:` URLs pass through. R13 must use an explicit policy and denylist | Velotype review (setter premise executed in jsdom) |
| Explicit per-value reactive wrappers instead of auto-tracking | Pushes complexity into components; `state()` + `effect()` already exist | Velotype review |
| Global id registry for ownership | Only correct when every DOM removal goes through the library | Velotype review |
| MutationObserver-based auto-cleanup | Global machinery, fuzzy ownership; Lume cleans what it owns | External suggestion, 2026-10-21 |
| Dependency-tracked `computed()`, keyed DOM-stable `repeat()`, idempotent disposers, cross-store `batch()`, URL scheme filtering | **Already exist** — proposed as new by external suggestions | `src/addons/computed.js`, `src/addons/repeat.js`, `src/core/batch.js`, `src/handlers/stringAttr.js` |
