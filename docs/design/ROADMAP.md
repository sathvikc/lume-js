# Lume.js Roadmap

> **Purpose:** The execution plan — what to build next, in what order, and *why*. Every item says what it is, why it matters, where it lives in the code, how to approach it, what artifacts it needs, and when it counts as done. A new session should be able to pick up any item from this file alone.
> **Created:** 2026-10-21 · **Baseline:** v2.4.0 · 475 tests · 100% coverage · sizes (gz): `state` 1.49 / 1.75 KB, `index` 2.77 / 3.00 KB, `handlers` 1.23 / 2.00 KB, `addons` 4.96 / 6.00 KB, `global` 7.75 KB
> **Last execution pass:** 2026-10-26, see [Execution log](#execution-log-2026-10-26). Implementation lives on branch `feat/roadmap-backlog` (8 commits off `main` 4efcf41). Independently verified the same day, with three documentation gaps to close before merging; see [Independent verification](#independent-verification-of-featroadmap-backlog-2026-10-26).  
> **Latest update:** 2026-10-28. `feat/roadmap-backlog` is merged into `main` (rebased, new commit IDs) and the branch is deleted; R19, R20, R23 and R24 shipped on `main`, R25 turned out to be already documented, and a regression in the R2 change was found and fixed on `main`. See [Merged to main](#merged-to-main-2026-10-28). Earlier: 2026-10-27 Velotype comparison (section 4 of "Where this roadmap came from", Phase 6 candidates, notes on R12/R13).
> **Status:** Living document. When an item ships, tick it here, mark it ✅ in `VISION.md` if it appears there, and add a dated note.

---

## How to use this document

1. Read `AGENTS.md` (process contract), then `docs/design/design-decisions.md` (ratified decisions), then this file. `VISION.md` owns direction and philosophy; this file owns the concrete backlog.
2. Pick items **in phase order** unless there is a reason not to. Phase 1 items are verified bugs in shipped code.
3. Each item lists the artifacts `AGENTS.md`'s matrix requires. Items marked **Decision gate** must land their `design-decisions.md` entry/amendment *before or with* the code — the ratified entry wins until it is amended.
4. One item = one commit (or one proposal branch for the large ones), carrying all its artifacts. All five quality gates must pass. Implement on a branch other than the one holding this file, and never copy this file into it. Commit messages, decision entries and docs must describe each change in their own words, with no references to this file or to item IDs (`R5`), because this file will go stale. Record outcomes (shipped, closed, measurements, spec corrections) back **here**, on this file's own branch. *(Amended 2026-10-26.)*
5. Headroom is tight on `index` (0.23 KB left) and `state` (0.26 KB left). Any item touching core must report its size delta in the commit body.

---

## Execution log (2026-10-26)

Every item was attempted in phase order on a separate branch, `feat/roadmap-backlog`, cut from `main`. This file was read from this branch and never copied there. Each shipped item is one commit with all its `AGENTS.md` matrix artifacts. Every commit passes `npm run validate` on its own. Final state: 503 tests (was 475), 100% coverage.

| ID | Result | Commit on `feat/roadmap-backlog` |
|---|---|---|
| R1 | Shipped, different approach than suggested | e2c5929 |
| R2 | Shipped, two spec corrections | 5e31553 |
| R3 | Shipped as `data-bind-scope`; one symptom did not reproduce | cc9a0a3 |
| R4 | **Deferred**: +40% raw reads, breaks private-field getters | — |
| R5 | Shipped; caveat in spec was wrong | dcc26c7 |
| R6 | **Closed**: common updates already minimal | — |
| R7 | Shipped; created missing Hardening section | e112445 |
| R8 | Shipped, added `select.store` | ec0425b |
| R9 | **Closed**: listener cost is noise | — |
| R10 | **Closed**: precondition unmet | — |
| R11-R15 | **Not started**: needs maintainer decision | — |
| R16 | Shipped; fixed an unsafe `innerHTML` example | dc231e5 |
| R17 | Partly done; tagline not adopted | bdba88d |
| R18 | Blocked on Phase 4 | — |

**Sizes after the pass (gz):** `state` 1.49 / 1.75 (unchanged), `index` 2.87 / 3.00, `handlers` 1.23 / 2.00, `addons` 5.03 / 6.00, **`global` 7.93 / 8.00**. The baseline line in the header omitted the global budget; at 99.1% it is now the binding constraint, ahead of the `index` headroom this file flagged.

**Lessons for whoever updates this file:**

1. **Measure before building perf items.** Two of the three perf items (R6, R9) and the kernel item R4 fell over on a five-minute measurement. Future perf items should carry a number showing today's cost, not just the technique.
2. **Re-run repros in both call orders** where order can matter (R3's second symptom only appears in the reverse order).
3. **State warning behavior as part of the spec.** R2's spec said what to render but not whether to warn on `null`; that became a user-visible decision.
4. **Caveats need the same verification as bugs.** R5's caveat was asserted, not run, and was wrong.
5. **Commits must not reference this file.** Implementation commits, decision entries and docs on `feat/roadmap-backlog` describe each change in their own words, with no roadmap or item-ID references, because this file will go stale or be deleted. Step 4 of "How to use this document" is amended accordingly. The pointers this branch's own commit added to `AGENTS.md`, `CLAUDE.md` and `VISION.md` were deliberately **not** carried over, for the same reason.
6. **Local environment trap:** on Node 26, the built-in `localStorage` shadows jsdom's and 19 `persist` tests fail even on `main`. Run gates with `NODE_OPTIONS=--no-experimental-webstorage`. CI pins Node 22 and is unaffected.

---

## Merged to main (2026-10-28)

`feat/roadmap-backlog` was merged into `main` by rebasing, so every commit got a new ID, and the branch was then deleted. Verified 2026-10-28: the rebased tip (`bbf4889`) has a tree identical to the original tip (`bdba88d`), so nothing was lost or changed in the merge.

| Item | Original commit (deleted branch) | Commit on `main` |
|---|---|---|
| R1 | e2c5929 | e0bf948 |
| R7 | e112445 | 1543697 |
| R5 | dcc26c7 | d10f5d2 |
| R3 | cc9a0a3 | 1e77c2b |
| R2 | 5e31553 | 8d93add |
| R8 | ec0425b | bec390e |
| R16 | dc231e5 | 39606fa |
| R17 (partial) | bdba88d | bbf4889 |

Follow-up commits on `main` after the merge:

| Commit | What | Roadmap effect |
|---|---|---|
| d5f964c | docs: placeholder clearing under `null` parents (SSR guide, CHANGELOG) and strict `select` matching made explicit | Closes R24 and R23 |
| 942863a | fix(core): step through plain objects and arrays in nested binding paths again | Fixes a regression introduced by R2 (see below) |
| df5ecf4 | docs(repeat): warn that `create()` listeners see the row's first item | Closes R19 |
| fe9afca, 762bbe3 | ci: browser smoke tests in headless Chromium; warn on console errors across every example page | Closes R20 |

**The R2 regression (fixed by 942863a):** the subscription-chain rewrite required every intermediate in a path to be a `state()` store. Before it, `bindDom` walked plain objects and arrays and only the object holding the last key had to be reactive. So `data-bind="list.0.name"` over an array of states and `data-bind="cfg.user.name"` through a plain `cfg` both rendered empty and never updated, and the second warned. Arrays cannot be `state()`, so the array-of-states pattern became impossible. Neither the execution pass nor the independent verification caught it: both tested replacement, `null`, restore and cleanup, but no path with a plain object or array in the middle, and both accepted "plain objects warn" as the intended behavior without checking what `main` did before. 942863a steps through plain objects and arrays once without subscribing, as before, with regression tests; `index` 2.87 → 2.90 KB, `global` 7.93 → 7.96 KB.

**Sizes on `main` after the follow-ups (gz, executed 2026-10-28):** `index` 2.90 / 3.00, **`global` 7.96 / 8.00 (99.5%)**. The global bundle has 0.04 KB left.

### `data-bind="list.0.name"`: supported, but never decided (executed 2026-10-28)

- **History:** index paths were never designed or documented as a feature. They worked incidentally from the first path resolver (2025-10-03, 91d7815: a generic `acc[key]` walk, and arrays are objects whose indexes are keys). No test, doc or CHANGELOG entry mentioned a numeric path segment until 942863a (2026-10-26), which added regression tests and, for the first time, documented `list.0.name` in `docs/api/core/bindDom.md` and the nested-path decision entry.
- **Not contradicted by a decision, but close to one:** "Why Nested State for Multiple Checkboxes Instead of Arrays?" rejects binding checkboxes to an *array value* (two-way array membership), not reading through an index in a path. Its spirit (prefer nested `state()` objects over array bindings) and the lists guide's "use a database ID, never array index" both lean against positional bindings.
- **Behavior on `main` (probe: `state({ list: [state({ name: 'A' }), state({ name: 'B' })] })`, `<span data-bind="list.0.name">`):** renders `A`; editing `list[0].name` updates; **reversing the array in place leaves the span on the old object** (shows `A2` while `list[0]` is `B`), because the array is a plain step and is not watched; replacing the array (`store.list = [...]`) re-links; an empty array renders empty but warns `Path "list.0.name" is not reactive at "0"`, which misdescribes a missing index.
- → tracked as **R26**: decide whether index paths are a supported pattern.

---

## Independent verification of `feat/roadmap-backlog` (2026-10-26)

A second session re-checked the execution pass instead of trusting the log above. Branch state at the time: 8 commits ahead of `main` (4efcf41), 0 behind, so it merges cleanly.

**Gates (Node 22):** `vitest --coverage` 503/503 passing, 100/100/100/100; `npm run lint`, `node scripts/complexity.js`, `npm run typecheck` clean; `npm run size` within every budget (`global` 7.93 / 8.00, `index` 2.87 / 3.00); `build-llms --check` and `sync-docs --check` in sync.

**Original repros re-run against the branch:**

| Repro | Before | On the branch |
|---|---|---|
| R1 clamp effect + `computed(() => s.a * 2)`, write 50 | `100` (stale) | `20` |
| R2 replace `store.user` | old value shown, typing wrote to the old object | new value shown, typing writes to the new object, old object no longer drives the DOM; the `data-hidden` handler follows too |
| R2 `profile: null`, assigned later | dead binding | activates |
| R2 set path to `null`, then restore | — | renders empty, input writes nowhere (no throw), then re-links |
| R2 after `bindDom()` cleanup | — | no further updates |
| R3 nested roots, outer-first and inner-first | outer store polluted with the inner key | outer store untouched, inner store drives the input, in both orders |
| R5 `watch` transitions | one argument | `undefined->idle`, `idle->loading`, `loading->done` |

No console warnings during the run. A code review of every `src/` diff (`bindDom.js`, `computed.js`, `watch.js`, `repeat.js`, `stringAttr.js`) found no correctness bugs.

**Note on the R3 correction above:** the "input shows A's value" symptom *does* reproduce in the outer-first order when the user types first: typing leaves a pending write on the outer store, which flushes after the inner store and overwrites the input. The original repro did not spell out that sequence. Moot now, since the boundary prevents both symptoms.

### Open documentation gaps (fix before merging `feat/roadmap-backlog`)

> **Resolved 2026-10-28:** gaps 1 and 2 shipped on `main` in d5f964c; gap 3 was already documented (see R23–R25). Kept below as the original record.

All three were found by running edge cases against the branch. None is a code bug.

1. **`select` uses strict equality, undocumented.** `selectedId: '2'` against item key `2` selects nothing, silently. Keys read from the DOM (`dataset`, input values) are strings, so this will be hit. Add one line to `docs/api/addons/repeat.md` (and the `select` JSDoc): the selected value must be `===` the row key, same type.
2. **Server-rendered placeholders under a `null` parent are now cleared at bind time.** `<span data-bind="user.name">Loading…</span>` with `user: null` used to keep "Loading…" (dead binding plus a warning); it now renders empty and waits. This matches how a flat `undefined` value already behaved, but it is a visible change for server-rendered pages. Add one line to `docs/guides/ssr-hydration.md` and to the nested-path entry under `### Changed` in `CHANGELOG.md`.
3. **Unclear error for `select` over a `computed()` list without `select.store`:** it throws `source.$subscribe is not a function`. The clearer message was removed to save bytes, which is acceptable with 0.07 KB left in the global budget. At minimum, `docs/api/addons/repeat.md` should say `select.store` is required when the list source is a `computed()`.

---

## Retrospective: what this roadmap's original spec got wrong, and why

The spec was written on 2026-10-21. The execution pass and the verification above showed where it was wrong. One pattern explains every miss: **every claim that something was a problem was executed; the proposed solutions, caveats, and performance premises were reasoned out and written down with the same confidence.**

| Claim in the original spec | Executed before writing? | What went wrong |
|---|---|---|
| The three Phase 1 bugs (R1, R2, R3) | **Yes**, reproduced against `src/` | Held up. All three were real and are fixed. |
| R1 fix direction: retry when the guard clears | No, reasoned | Verified the bug, not the fix. A retry cannot tell a self-triggered run from an external one, so a computed that never converges loops forever across microtasks. The item said "decide test-first" and still put an untested direction under "How". |
| R5 caveat: in-place nested edit gives `previous === next` | No, asserted | Wrong. Editing `store.user.name` writes the nested store, never the watched key `user`, so the watcher does not fire at all. One probe would have shown it. |
| R4 fix: read through `Reflect.get(target, key, proxy)` | Bug yes, fix **no** | The fix was never benchmarked (+40% on raw reads, the hottest path) and the spec missed a well-known Proxy gotcha: with the proxy as the getter's `this`, class getters reading `#private` fields throw. |
| R6 head/tail trimming, R9 delegated `on()` | No, the technique was borrowed from other libraries | Proposed because Vue/Regor/Gea do them, not because Lume had a measured cost. Measurement closed both: the common list updates already make the minimum DOM moves, and 10,000 listeners cost 1.5 ms. |
| "Headroom is tight on `index`" | The numbers were read and used badly | `docs/metrics.json` already showed `global` at 7.75 / 8.00. The header listed four budgets and left out the one that binds. |
| R2 "zero overhead for flat paths" | Not testable before code | A design goal phrased as a requirement; the result costs one extra closure call per update. Should have been written as a goal. |
| R2 behavior for a `null` intermediate | Not specified | The spec said what to render but not whether to warn, which became a user-visible decision during implementation. |
| R3 symptom "input shows A's value" | Yes, observed | Correct but under-specified: it depends on typing first, which the repro did not state. |
| R2 verification: "no correctness bugs" (2026-10-26) | Partly: replacement, `null`, restore and cleanup were run | Missed a regression: paths through a plain object or array (`list.0.name`, `cfg.user.name`) stopped working. Never probed, and "plain objects warn" was accepted as intended without checking what `main` did before. Fixed on `main` by 942863a. |
| R25 "select over `computed()` needs `select.store`, undocumented" and R23 "strict equality, undocumented" | No: decided by a literal grep | R25 was documented in the original commit (written as `select: { key: 'selected', store }`, so a grep for `select.store` missed it); R23 was half-documented. Absence claims need the section read, not a keyword search. |

**Genuinely only discoverable while building** (normal, not spec errors): the cognitive-complexity limit forcing `bindElement()`/`inNestedScope()` out of `performBinding`; the flat-path closure cost; `select.store` being needed for `computed()` lists; a `render` that rewrites `className` wiping the selection class.

### Rules for writing or updating items in this file

1. **Tag every claim** as *executed* (with the command or repro) or *reasoned*. Never mix the two at the same confidence.
2. **A proposed fix gets a prototype before it goes under "How".** Otherwise label it "direction, unverified".
3. **Performance items carry a measured baseline from Lume itself**, not "library X does this".
4. **Report every size budget** and name the one closest to its limit.
5. **Specify warning and error behavior** for every edge state an item introduces (null, missing key, wrong type).
6. **Re-run repros in every call order and input sequence** where ordering can matter, and write the exact sequence into the repro.
7. **When a change replaces existing behavior, probe what the old code accepted, not just what the new spec lists.** For path handling that means at least: a flat key, a nested `state()`, a plain object mid-path, an array index mid-path, `null`, and a missing key, each on `main` before and on the branch after. (Added 2026-10-28 after the R2 regression.)
8. **"Not documented" is a claim like any other:** read the relevant section before asserting it; a keyword search proves presence, never absence. (Added 2026-10-28 after the false R25 gap.)

---

## Where this roadmap came from

The items below were derived from code-level reviews done on 2026-10-20/21, plus a fourth (Velotype) on 2026-10-27. Nothing here was taken from a README; every claim about Lume was reproduced by running Lume's own source, and every claim about another library was traced through its source code.

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

### 4. Comparison with Velotype (`Velotype/velotype` @ `49c54ff`, v0.3.2, 2026-10-27)

Claims are tagged per the rules above: **[executed]** was run against Lume's source (or, for the setter premise, a re-implementation in jsdom); **[traced]** was followed through Velotype's source, which could not be executed in the review environment.

Velotype is a Deno/JSR TypeScript `jsx-runtime` for the standard `react-jsx` transform: real DOM, no virtual DOM, no compiler of its own, TSX build required. About 4.4k lines of source plus 2.8k lines of JSX type declarations. Overlap with Lume is ~15% (real DOM, keyed lists with LIS minimal moves, template-cloned rows, no expressions in markup). Its value to this roadmap is that it is a **shipped example of the Phase 4 layer**, showing what that layer costs.

How it works [traced]:

- **No automatic reactivity.** Each reactive value is wrapped in a `RenderObject`; `set()` re-renders **synchronously, with no batching**, by **replacing the element**, unless the author writes a manual `handleUpdate` for in-place updates.
- Class components with `render`/`mount`/`unmount` and `refresh()`, which unmounts and rebuilds the whole subtree. Function components have no lifecycle.
- Cleanup runs through a **global numeric-key registry** (`domReferences`) plus an event bus. Roughly a quarter of the source (~1k lines across `component.ts`, `mounting.ts`, `dom-references.ts`, `event-bus.ts`, `with-component.ts`, `error-boundary.ts`) is lifecycle and ownership bookkeeping.
- Lists are imperative (`RenderObjectArray.push`/`insertAt`/`swap`/`move`/`sort`/`filter`, LIS-based `moveIntoOrder`); `RenderTemplateArray` clones a template per row and takes an `on` option that delegates row events from the wrapper with `(event, row, data, index)`.
- Tests run in headless Chrome (Astral), 20 test modules, not jsdom.

What we learned:

- **Spec gap for R13 (security):** attributes are set as DOM *properties* whenever a setter exists on the element's prototype chain [traced]. Re-implementing that check in jsdom finds setters for `innerHTML`, `outerHTML`, `srcdoc` and `href`, and assigning through that path creates an `<img>` from a string [executed]. So `<div {...untrustedProps}>` is HTML injection, and `href` gets no scheme filter [traced]. → added to **R13**.
- **Confirms the R13 reactivity model:** without auto-tracking, every reactive value needs a wrapper object and updates fall back to element replacement, which loses input state and focus below the root [traced]. Lume's `{() => store.x}` + `effect()` avoids both.
- **Confirms R12 is the hard part, and argues against a global registry:** registry entries are released only through Velotype's own insert/remove functions; an element removed with plain `el.remove()` appears to leave its entry behind [traced, not proven]. → added to **R12**.
- **Worth copying into Phase 4:** rollback when a render throws (keep the current DOM, release what the failed render created) → **R13**; an `unmountSignal` (`AbortSignal`) as the standard cleanup handle → **R12**, with a browser-floor caveat.
- **For today's Lume:** the `repeat()` `create()` stale-item footgun → **R19** (found by testing the pattern Velotype's row `on` option avoids); real-browser tests → **R20**; a row `on` option → **R21**; an async-data helper → **R22**.
- **Not taken (rule 3, measure first):** hiding filtered rows without unmounting (nobody has measured Lume's row re-creation cost); imperative list operations (Lume's immutable-array + LIS model already makes the minimum DOM moves).
- **Mistakes to avoid** → added to the Rejected table.

---

## Overview

| ID | Item | Phase | Type (AGENTS matrix) | Decision gate | Verified | Status (updated 2026-10-28; everything marked shipped is on `main`) |
|---|---|---|---|---|---|---|
| R1 | Fix stale `computed()` after same-flush writes | 1 | Bug fix | No | ✅ reproduced | ✅ shipped |
| R2 | Nested `data-*` paths follow object replacement | 1 | Behavior change | **Yes** | ✅ reproduced | ✅ shipped |
| R3 | Boundary for nested `bindDom` roots | 1 | Behavior change / new attr | **Yes** | ✅ reproduced | ✅ shipped |
| R4 | Getters on state objects become reactive | 2 | Behavior change (kernel) | **Yes** (amend) | ✅ reproduced | ⏸ deferred |
| R5 | `watch()` callback gets `(next, previous)` | 2 | Behavior change (addon) | No | ✅ reproduced | ✅ shipped |
| R6 | `repeat()` head/tail trimming before LIS | 2 | Perf (no API change) | Amend note | n/a (perf) | ✖ closed |
| R7 | `stringAttr`: treat `data` as a URL attribute | 2 | Security hardening | Short note | Low priority | ✅ shipped |
| R8 | `repeat()` O(1) selection option | 3 | New public API (option) | **Yes** | n/a (feature) | ✅ shipped |
| R9 | Delegated `on()` handler | 3 | Behavior change | **Yes** | Needs design | ✖ closed |
| R10 | Lazy `computed()` | 3 | Behavior change | **Yes** | Low priority | ✖ closed |
| R11 | Decision amendments for optional JSX | 4 | Docs (decision) | **Is the gate** | — | ⏳ needs decision |
| R12 | Owner scope for JSX-created effects | 4 | New public API | via R11 | — | ⏳ needs decision |
| R13 | `lume-js/jsx-runtime` | 4 | New public API + entry | via R11 | — | ⏳ needs decision |
| R14 | `lume-js/html` tagged template | 4 | New public API + entry | via R11 | — | ⏳ needs decision |
| R15 | JSX/html docs, types, examples, budgets | 4 | Docs/tooling | — | — | ⏳ needs decision |
| R16 | Security guide ("no expressions" posture) | 5 | Docs | No | — | ✅ shipped |
| R17 | `VISION.md` cleanup + "HTML-first, JSX-optional" | 5 | Docs | No | — | ◐ partial |
| R18 | Re-measure the Code Verbosity challenge | 5 | Docs | No | — | ⏳ blocked |
| R19 | Document the `repeat()` `create()` stale-item closure | 6 | Docs only | No | ✅ reproduced | ✅ shipped on `main` (df5ecf4) |
| R20 | Real-browser smoke tests in CI | 6 | Build / CI / tooling | No | ✅ gap confirmed | ✅ shipped on `main` (fe9afca, 762bbe3) |
| R21 | `repeat()` delegated row `on` option | 6 | New public API (option) | **Yes** | ✅ footgun reproduced | ⏸ blocked on budget |
| R22 | Async-data helper (pending/resolved/rejected) | 6 | New public API | **Yes** | Gap confirmed, no demand data | ⏸ candidate only |
| R23 | Docs: `repeat()` `select` uses strict equality | 6 | Docs only | No | ✅ reproduced; was half-documented already | ✅ shipped on `main` (d5f964c) |
| R24 | Docs: server-rendered placeholder under a `null` parent is now cleared | 6 | Docs + CHANGELOG | No | ✅ reproduced | ✅ shipped on `main` (d5f964c) |
| R25 | Docs: `select` over a `computed()` list needs `select.store` | 6 | Docs only | No | Behavior reproduced; **gap was false** | ✖ not needed: documented since the original `select` commit |
| R26 | Decide whether `list.0.name` index paths are a supported pattern | 6 | Decision (+ docs or warning text) | **Yes** | ✅ behavior probed | ⏳ needs maintainer decision |

---

## Phase 1 — Correctness (verified bugs in shipped code)

These come first because they are wrong behavior today, not missing features. Each was reproduced against `src/`.

### R1. Fix stale `computed()` after a same-flush write

- [x] Status: **shipped** on `feat/roadmap-backlog` (e2c5929), 2026-10-26 · no decision gate needed per this item, but one was added because the self-mutation semantics changed

  **Outcome:** the repro now yields `20`. Took the "remove the deferred guard" alternative, **not** the suggested `rerunRequested` direction.

  **Why the suggested direction was rejected:** a retry-when-guard-clears cannot tell a self-triggered run from an external one. A computed that never converges (`s.count = s.count + 1`) would then re-arm the guard every microtask: an endless microtask loop that the flush cap never sees, because each run is a fresh flush. Running `fn()` inside `batch()` was also tried on paper and rejected: inside an outer batch flush `batch()` nests, the writes land in the next wave after the guard is cleared, and writes to unrelated stores would start flushing synchronously mid-computation.

  **Semantics now:** `computed()` re-runs exactly like `effect()`. A converging self-write (clamp/normalize) settles after one extra run; a non-converging one hits the shared 100-iteration flush cap and logs the existing "Maximum flush iterations" error (it used to be silently cut off after one run). The old test "suppresses self-triggered flush" was replaced by convergent and capped-runaway tests; the clamp regression test fails on the old code. Decision entry: "Why `computed()` Has No Self-Mutation Guard". Addons bundle got smaller (4.96 -> 4.94 KB).

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

- [x] Status: **shipped** on `feat/roadmap-backlog` (5e31553), 2026-10-26 · decision entry "Why Path Bindings Follow Object Replacement"

  **Outcome:** all four reproduced failures fixed, for `data-bind` and every handler attribute (shared `watchPath`/`follow` helpers in `src/core/bindDom.js`; `resolvePath`/`resolveProp` are gone). Tests assert the old object no longer drives the DOM, typing writes to the current leaf object, deep paths re-link when a middle object is replaced, and live subscription count returns to 0 after cleanup across every link (counted via a Proxy around `$subscribe`).

  **Corrections to this item's spec:**
  - "Single-segment paths take the current fast path unchanged, zero overhead" is not quite true: flat paths are still one `$subscribe`, but each update goes through one extra closure call, and two-way inputs do one WeakMap lookup per update to keep the write target current. Not measurable in `npm run bench` (`update 1k bound properties` unchanged within noise), but not literally zero.
  - Warning behavior changed and should be stated as a decision, not a detail: a `null`/`undefined` intermediate now renders empty and waits **without** a warning (it is the normal async shape). A missing key (likely a typo) and a plain unwrapped object still warn. The previous test "warns and skips when intermediate path is null" was replaced.
  - While the chain is broken, the delegated input listener writes nowhere (the binding's target is `null`); the old code would have thrown or written into a stale object.

  **Docs touched:** `docs/api/core/bindDom.md` (new "Nested paths" section), `docs/guides/reactivity.md`, `docs/guides/two-way-binding.md`, `docs/ARCHITECTURE.md` (the "documented tradeoff" paragraph rewritten), `CLAUDE.md` gotcha (now "Paths are followed, elements are not"), `AGENT_GUIDE.md` rule 2. `examples/form-heavy` (heaviest user of nested paths) smoke-tested in Chrome: nested two-way binding works, zero console warnings.

  **Size:** `index` 2.83 -> 2.87 KB gz (budget 3.00).

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

- [x] Status: **shipped** on `feat/roadmap-backlog` (cc9a0a3), 2026-10-26 · decision entry "Why `data-bind-scope` Marks Nested Roots"

  **Outcome:** attribute name chosen: **`data-bind-scope`**. An outer `bindDom()` skips any element whose nearest `[data-bind-scope]` ancestor lies inside its root and is not the root. The scope element's **own** attributes still bind to the outer store (so a page can hide/show a widget via its container); nothing binds twice because `bindDom()` never binds its own root element.

  **Correction to the repro:** of the two listed symptoms, the cross-store write reproduced (typing in the island wrote `query` into **both** stores, giving `A` a stray key). "Input shows A's value" did **not** reproduce in the listed call order (outer first, then inner): the inner binding's subscription ran last and won. It would only show up in the reverse order. Tests cover both orders.

  **Implementation note:** adding the check pushed `performBinding` over the sonarjs cognitive-complexity limit (18 > 15). Fixed by extracting `bindElement()` and `inNestedScope()`, not by suppressing the rule. The deep-nesting test initially passed on the old code too (later binds overwrote earlier ones); it binds outermost-last so it actually proves the boundary.

  **Size:** `index` 2.77 -> 2.83 KB gz.

**What:** A way to tell an outer `bindDom()` not to bind inside a region owned by another store.

**Why:** `bindDom(root)` uses `root.querySelectorAll(...)`, which reaches into nested islands. Reproduced: outer store `A = { title }`, inner region bound to `B = { query }` with `<input data-bind="query">`. Result: typing writes to **both** stores, `A` gains a stray `query` key, and after `B.query = 'fromB'` the input shows `A`'s value — the outer flush runs second and overwrites it. Islands embedded in a page-level binding are a core Lume use case (WordPress/Shopify widgets).

**How:** A `data-*` boundary attribute (name to be decided in the decision entry, e.g. `data-lume-scope`) placed on the inner container. The outer `bindDom` skips matched elements whose closest boundary (between the element and the root) is not the root itself. Because the outer binding never registers those elements, its delegated `input` handler never writes to them either. The inner `bindDom(innerEl, B)` is unaffected (its root is the boundary).

**Where:** `src/core/bindDom.js`, tests, `docs/api/core/bindDom.md`, a short section in a guide about islands.

**Artifacts:** tests (the repro + boundary on root itself still binds + deeply nested boundaries), docs, CHANGELOG `Added`, decision entry (new attribute; why opt-in attribute rather than automatic root detection — order of `bindDom` calls is not knowable).

**Done when:** the repro shows `A` untouched and `B` driving the input.

---

## Phase 2 — Small, high-value improvements

### R4. Getters on state objects become reactive

- [ ] Status: **deferred, not shipped** (2026-10-26). Prototyped and measured; prototype reverted. Needs a design decision before anyone retries it.

  **Findings (all verified):**
  1. **Hot-path cost:** `Reflect.get(target, key, receiver)` in the get trap made raw proxy reads ~40% slower: `state-read (100k reads)` 1.04-1.09 ms -> 1.47-1.56 ms, three `npm run bench` runs each way on the same machine. Effect, computed and DOM benches were within noise. The "report the delta and judge it" criterion: judged not acceptable for the kernel's hottest path.
  2. **Breaks working code:** class getters that read private fields (`get full() { return this.#first + ... }`) work today and throw `TypeError: Cannot read private member #first from an object whose class did not declare it` once `this` is the proxy. `docs/api/core/state.md` documents class instances as "partial" support, so this regresses a supported case.
  3. **Half support is worse than none:** getters would track in `effect()`/`computed()` but stay silently dead in `data-bind`, `watch()` and `$subscribe` (nothing ever writes the getter key). This item already notes it; in practice it means Lume's primary APIs would not see getters, and the current simple rule ("getters are not reactive") becomes a confusing partial one.

  **Viable shape for a retry:** detect accessor keys once in `state()` (`Object.getOwnPropertyDescriptors`) for plain object literals only, so getter-less stores pay nothing on reads and class instances are untouched; **plus** a getter-aware `bindDom` path (e.g. bind getter keys through `effect()`), costed together against the `index` entry, which has ~0.13 KB left after R2/R3.

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

- [x] Status: **shipped** on `feat/roadmap-backlog` (dcc26c7), 2026-10-26

  **Outcome:** callbacks are called as `(newValue, previousValue)`; one closure variable per watcher, no extra subscriptions. Semantics exactly as specified (immediate call gets `undefined`; with `immediate: false` the subscribe-time value is the baseline; coalesced/batched writes never appear as `previous`). `index.d.ts` callback type is `(value: T[K], previous: T[K] | undefined) => void`; one-argument callbacks still type-check (verified with a scratch `tsc` file, since the repo has no type tests).

  **Correction to this item's caveat:** "if the watched key holds a nested `state()` object mutated in place, `previous === next`" is wrong. An in-place edit (`store.user.name = 'B'`) writes the **nested** store, never the watched key `user`, so the watcher does not fire at all. Replacing the object fires with the old object as `previous`. Docs and a test state the real behavior.

  **Compatibility note added to CHANGELOG:** a callback passed by reference that already declares an optional second parameter (e.g. `format(value, options)`) now receives the previous value there.

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

- [ ] Status: **closed without shipping** (2026-10-26). Measured first; the premise did not hold.

  **Findings:** the item says the common updates "need no map at all", implying they are expensive today. They are not, in DOM terms: at 1,000 rows, append, prepend, remove-one and edit-one already make the minimum `insertBefore` calls (1, 1, 0, 0), because every survivor is already in the LIS. Trimming could only skip pure-JS work (the `prevIndex` Map, the positions array, the LIS), which costs 0.03 ms per update at 1,000 rows and 0.35 ms at 10,000 rows (Node, unthrottled), less than the per-row bookkeeping `updateList` does regardless (0.034 / 0.59 ms). It would spend roughly 0.1 KB of the global bundle, which now has 0.07 KB left. Reopen only with a profile of a real 10k+ row list showing this pass mattering.

**What:** Before building the position map and running the LIS, skip the common prefix and suffix of rows that did not move; run the minimal-move plan only on the middle.

**Why:** `reconcileDOM` (`src/addons/repeat.js:~405–440`) builds a `prevIndex` `Map` over *every* surviving row and runs LIS on every update. The most common updates — append, prepend, remove-one, edit-one — have long unchanged prefixes/suffixes and need no map at all. This is the standard trick in Vue/Regor/ivi keyed diffs.

**How:** After removing departed rows, walk `nextEls` and the container's element children from the start while they match, then from the end while they match (skipping the in-container source `<template>` — `keepEl`). Only the middle slice goes through `prevIndex` + `stableChainMarkers`. No API or ordering change.

**Where:** `src/addons/repeat.js`, `tests/addons/repeat.test.js` (spy on `insertBefore` to assert zero moves for append/prepend/remove-one, plus existing identity tests).

**Artifacts:** tests, CHANGELOG `Changed` (perf), dated note on the "minimal-move reordering" amendment under "Why No Virtual DOM?" in `design-decisions.md`. Keep function complexity ≤ 10 — extract a helper.

### R7. `stringAttr`: treat `data` as a URL attribute (low priority)

- [x] Status: **shipped** on `feat/roadmap-backlog` (e112445), 2026-10-26

  **Outcome:** `data` added to `URI_ATTRS`; test, `@security` JSDoc, CHANGELOG `Security`. Browser execution of `javascript:` in `<object data>` was **not** re-verified (no reliable way in jsdom); the hardening note is written as defense in depth so it holds either way.

  **Gaps found while doing it:** `docs/api/handlers/stringAttr.md` never described URL filtering at all (now has a "URL safety" section), and `design-decisions.md` had **no** "Hardening" section even though `AGENTS.md`'s matrix sends security notes there. Created "## Security Hardening" before "Future Considerations"; R7's note is its first entry.

**What:** Add `data` (the `<object data>` URL) to `URI_ATTRS` in `src/handlers/stringAttr.js`.

**Why:** Defense in depth; Gea's sanitizer covers it, Lume's doesn't. Low priority: `data` is not in the `htmlAttrs()` preset, so it only matters for users who call `stringAttr('data')` explicitly. Confirm current browser behavior for `javascript:` in `<object data>` before writing the `@security` note. (`xlink:href` was considered and dropped: `data-xlink:href` is not a usable CSS-selector attribute name.)

**Artifacts:** test, `@security` doc note, CHANGELOG `Security`, short Hardening note in `design-decisions.md`.

---

## Phase 3 — Performance and DX in addons/handlers

### R8. `repeat()` O(1) selection option

- [x] Status: **shipped** on `feat/roadmap-backlog` (ec0425b), 2026-10-26 · decision entry "Why Selection Is a `repeat()` Option"

  **Outcome:** `select: { key, className = 'selected', store? }`. A selection change touches exactly two rows (asserted over 1,000 rows with a MutationObserver counting class mutations). Rows created later with the selected key get the class.

  **Additions beyond the spec, and why:**
  - `select.store`: `repeat()` over a `computed()` (`repeat(el, visible, 'value', ...)`) is a documented pattern, and a computed has no keys to subscribe to, so the selection must come from the real store. Omitting it there throws at the call (the `$subscribe` TypeError); an explicit error message was written and then removed to save bytes.
  - Re-marking on every render: a `render` that does `el.className = 'row'` wiped the class, so each rendered row re-applies it when its key is selected (one `===` per row per render).
  - The two duplicated row-teardown blocks (reactive vs non-reactive cleanup) became one `teardown()`, which also releases the selection subscription. Selection logic lives in `trackSelection()` to stay under the complexity limit.

  **Example:** `examples/template-list` now selects on row click; verified in Chrome, including that the selection survives Shuffle.

  **Size warning:** addons 4.94 -> 5.03 KB, **global 7.84 -> 7.93 KB of 8.00**. The global bundle is now the binding constraint for every further item.

  `VISION.md`'s performance table was not re-measured against Solid; only a dated note says the 1-in-1000 selection case is now O(1).

**What:** An option such as `select: { key: 'selectedId', className: 'active' }` that keeps exactly one row marked as selected.

**Why:** "Highlight the selected row" is the canonical list update, and `VISION.md`'s performance table lists "List update (1 in 1000)" as Lume's worst gap (~50× Solid). Today it costs O(N): either every row re-checks `selectedId === item.id` or the user writes the bookkeeping by hand. Gea's `relationalClass` shows the right shape: one subscription on the selection key, toggle the class on the previous and next row via the existing key→element map — two DOM writes regardless of list size.

**How:** One `$subscribe(store, select.key)` inside `repeat()`; remember the previously selected key; on change, `classList.remove` on `elementsByKey.get(prev)` and `classList.add` on `elementsByKey.get(next)` (use `classList`, not `className =`, since rows have other classes). Newly created rows get the class if their key matches. Removed rows need no work. Unsubscribe in `repeat()`'s cleanup.

**Where:** `src/addons/repeat.js`, `src/addons/index.d.ts` (`RepeatOptions`), `docs/api/addons/repeat.md`, `docs/guides/lists.md`, tests, optionally an example (selection is visually demonstrable).

**Artifacts:** full "new public API" row of the matrix, including a decision entry (why an option on `repeat` rather than a separate addon — addons cannot import addons, and the key→element map lives inside `repeat`).

### R9. Delegated `on()` handler

- [ ] Status: **closed without shipping** (2026-10-26). Measured before designing.

  **Findings (Chrome, via the vite dev server):** 10,000 raw `addEventListener` calls take 1.5 ms. `bindDom` over 10,000 `data-onclick` buttons costs 26.8 ms vs 26.0 ms over 10,000 `data-hidden` buttons, i.e. listener wiring is noise next to the bind scan. Delegation would change observable `event.currentTarget` / `stopPropagation()` behavior to save nothing measurable, with 0.07 KB left in the global budget. The cleanup caveat in `src/handlers/on.js` remains the only reason to revisit; judge it on that alone.

**What:** Install one listener per event type instead of one per element, looking handlers up per element in a `WeakMap`.

**Why:** Fewer listeners on large pages, and it removes the documented caveat that `bindDom` cleanup does not detach `on()` listeners from elements that stay in the DOM (`src/handlers/on.js` doc comment). Lume already delegates two-way `input`.

**Design problems to solve first (this is why it is Phase 3):**

- The handler contract is `{ attr, apply(el, val) }` — `apply` has no access to the `bindDom` root. Options: a lazily installed document-level listener per event type (module state created on first `apply`, not at import — `sideEffects: false` stays intact), or extending the handler contract (bigger change).
- Non-bubbling events (`focus`, `blur`, `mouseenter`, `mouseleave`, `load`, `error`, `scroll`) need capture-phase listening or a per-element fallback.
- Semantics change: `event.currentTarget` differs and `stopPropagation()` in an inner native listener would now block Lume handlers. Either emulate `currentTarget` (Gea does) or document it.

**Artifacts:** decision entry is mandatory (observable event semantics change), tests per event category, docs, CHANGELOG. Measure benefit before merging — if it doesn't matter at realistic sizes, close it.

### R10. Lazy `computed()` (low priority; after R1)

- [ ] Status: **closed without shipping** (2026-10-26). The item's own precondition ("only if profiling shows unused computeds costing real time") is unmet: no such profile exists. R1's fix did not change this analysis.

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

- [ ] Status: **not started; awaiting a maintainer decision** (2026-10-26). Phase 4 contradicts two ratified positions as written (`design-decisions.md` "Why Standards-Only?" rejects JSX/template literals; `VISION.md` "Will NOT Add" lists a component system). R11 is where that would change, and it is a product-direction call for the maintainer, not an implementation step an agent should take on its own.

**What:** Amend the ratified documents so the JSX layer is legal before any code lands:

- `design-decisions.md` "Why Standards-Only?" — the alternatives list rejects "JSX/Template literals → requires build step". Add a dated amendment: tagged template literals need no build at all (standard ES2015); JSX is acceptable as an **optional** separate entry because the core never requires it.
- `VISION.md` "Will NOT Add": "Build step requirement" stays banned (unchanged — JSX is opt-in). Clarify "Component system" (functions returning DOM are not a component system: no instances, no lifecycle, no re-render).
- `AGENTS.md` hard constraints: scope "No custom syntax beyond `data-*`" to HTML markup; add the dependency direction for the new layer (proposed: JSX/html modules may import core and `utils/`, not addons or handlers). To share the URL filter, move it from `src/handlers/stringAttr.js` to `src/utils/` and widen "handlers import nothing (or `utils/log.js`)" to "(or `utils/*`)".
- New size budgets for the new entries in `scripts/check-size.js` and the `AGENTS.md` table (proposal: `jsx-runtime` + `html` combined ≤ 1.5 KB gz). Existing budgets do not move.

**Artifacts:** docs only, one commit, `docs(design):`.

### R12. Owner scope for JSX-created reactivity

- [ ] Status: **not started; awaiting a maintainer decision** (2026-10-26). Phase 4 contradicts two ratified positions as written (`design-decisions.md` "Why Standards-Only?" rejects JSX/template literals; `VISION.md` "Will NOT Add" lists a component system). R11 is where that would change, and it is a product-direction call for the maintainer, not an implementation step an agent should take on its own.

**What:** A cleanup scope so a rendered JSX tree can be disposed with one call, e.g. `const dispose = render(() => <App />, el)`.

**Why:** Every reactive prop/child in JSX creates an `effect()`. Without an owner, removing a subtree leaks its effects — the problem Gea solves with a `Disposer` tree and Regor with unbinders. This is the hard part of the JSX layer; build it first.

**How:** The JSX runtime creates its own effects for reactive props/children, so it can register them with the current owner without touching `src/core/effect.js`. A reactive child region (a function child that returns nodes) gets a child owner that is disposed and recreated when it re-runs. User-created `effect()` calls inside components are **not** auto-owned in v1; expose an explicit `onCleanup(fn)` from the JSX module for that. Making core `effect()` owner-aware is a separate, later decision (kernel bytes).

**Done when:** rendering and disposing a tree 100 times returns subscriber counts to baseline (assert via a counting store or spies).

**Input from the Velotype review (2026-10-27):**

- **Own scopes through closures, not a global id registry.** Velotype's registry is only correct when every removal goes through the library; an element removed with plain `el.remove()` appears to leave its entry behind [traced, not proven]. Scope objects held by the closures that need them can be garbage-collected with the subtree.
- **Consider exposing an `AbortSignal` per scope** (Velotype's `unmountSignal`) as the standard cleanup handle, e.g. `fetch(url, { signal })`. Browser-floor caveat [reasoned from MDN, verify before relying on it]: `AbortController` and `fetch` signals fit the Chrome 80 / Safari 13.1 floor, but `addEventListener`'s `{ signal }` option needs Chrome 90 / Safari 15, so docs must not recommend it while the floor stays where it is.

### R13. `lume-js/jsx-runtime`

- [ ] Status: **not started; awaiting a maintainer decision** (2026-10-26). Phase 4 contradicts two ratified positions as written (`design-decisions.md` "Why Standards-Only?" rejects JSX/template literals; `VISION.md` "Will NOT Add" lists a component system). R11 is where that would change, and it is a product-direction call for the maintainer, not an implementation step an agent should take on its own.

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
- **Property-vs-attribute policy (added 2026-10-27, from the Velotype review):** decide explicitly which props are set as DOM properties. Never set HTML-injecting properties from props: deny at least `innerHTML`, `outerHTML`, `srcdoc` (and treat any future `dangerouslySetInnerHTML`-style escape hatch as out of scope for v1). Apply the URL scheme filter on the **property** path too (`el.href = ...`), not only on `setAttribute`. Rationale: Velotype sets any prop whose name has a setter on the prototype chain, which turns `<div {...untrustedProps}>` into HTML injection [setter premise executed in jsdom; Velotype path traced]. Tests must cover spread props carrying these names.
- **Rollback on a throwing render (added 2026-10-27):** when a reactive region's function child throws, keep the region's current nodes and dispose whatever the failed run created, then report the error. Velotype does this for components and render objects [traced].

**Biggest footgun to document loudly:** components run once. `{store.count}` is a static snapshot; `{() => store.count}` is reactive. React developers will hit this first (Solid has the same rule).

**Lists in JSX:** a function child returning `items.map(...)` rebuilds every row. v1 answer: use `repeat()` through `ref`, and leave a keyed JSX list helper as an open question (it would need the JSX layer to import an addon, which R11's dependency rule must allow or forbid).

**Where:** `src/jsx/` (or `src/jsx-runtime.js`), handwritten `src/jsx-runtime.d.ts` with the `JSX` namespace (`IntrinsicElements`, `Element = Node`), `package.json` `exports` for `./jsx-runtime` and `./jsx-dev-runtime`, `scripts/build.js` entries, `scripts/check-size.js` budget.

**Artifacts:** full "new public API" row: tests (jsdom), `.d.ts`, API docs + `docs/README.md` link (via `docs/manifest.json`), CHANGELOG, decision entry (covered by R11 + a specific entry for runtime semantics), example, README.

### R14. `lume-js/html` tagged template

- [ ] Status: **not started; awaiting a maintainer decision** (2026-10-26). Phase 4 contradicts two ratified positions as written (`design-decisions.md` "Why Standards-Only?" rejects JSX/template literals; `VISION.md` "Will NOT Add" lists a component system). R11 is where that would change, and it is a product-direction call for the maintainer, not an implementation step an agent should take on its own.

**What:** `` html`<button onclick=${inc}>${() => store.count}</button>` `` — the **no-build twin** of JSX, built on the same `h()` core as R13.

**Why:** Gives JSX-like authoring to users who refuse a build step (Lume's core audience) and directly attacks the Code Verbosity challenge. `VISION.md`'s brainstorm seeds already list template literals.

**How:** Parse each template's static strings once (cache by the `TemplateStringsArray` identity in a `WeakMap`), turn them into `h()` calls (the `htm` approach, ~0.5 KB). Interpolations are only ever used as attribute values, props, or child values — **never concatenated into markup and parsed as HTML**, so it is safe by construction (unlike Regor's `html`, which is plain string concatenation).

**Artifacts:** same as R13; shares its tests for semantics, adds parser tests (attributes, self-closing, fragments, nested templates, SVG, malformed input errors).

### R15. Docs, types, examples, budgets for the JSX layer

- [ ] Status: **not started; awaiting a maintainer decision** (2026-10-26). Phase 4 contradicts two ratified positions as written (`design-decisions.md` "Why Standards-Only?" rejects JSX/template literals; `VISION.md` "Will NOT Add" lists a component system). R11 is where that would change, and it is a product-direction call for the maintainer, not an implementation step an agent should take on its own.

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

- [x] Status: **shipped** on `feat/roadmap-backlog` (dc231e5), 2026-10-26 as `docs/guides/security.md`, registered in `docs/manifest.json` (needs an empty `<!-- lume:nav -->` marker pair for `docs:sync` to add the footer).

  **Verified before writing:** `src/` has no `eval`, `new Function`, `innerHTML`, `insertAdjacentHTML` or `outerHTML`; writes to `__proto__`/`constructor`/`prototype` are dropped; `state(JSON.parse('{"__proto__": {...}}'))` keeps `__proto__` as an own key and does not touch the prototype; subscriber cap returns a no-op with a logged error; `persist()` writes plain JSON to localStorage/sessionStorage and only assigns listed keys.

  **Found while writing:** the `repeat()` JSDoc example in `src/addons/index.d.ts` interpolated item text into `innerHTML` (the exact anti-pattern the guide warns about); fixed in the same commit. The guide also states the limit precisely: injected `data-*` can read any reachable key, two-way inputs can write to one, and `data-on*` can attach functions already in state.

**What:** `docs/guides/security.md` stating Lume's guarantees: attributes hold state **paths, never expressions** (so markup an attacker controls cannot execute code — unlike expression-evaluating template libraries); URL scheme filtering on bound URL attributes (including control-character evasion); `textContent` only; prototype-key write guard; subscriber cap; the trust model of `data-*` injection (can only reach existing state).

**Why:** This is Lume's most defensible difference and nobody can see it today. Both reviewed competitors fail at least one of these.

### R17. `VISION.md` cleanup and tagline

- [ ] Status: **partly done** on `feat/roadmap-backlog` (bdba88d), 2026-10-26

  - Done: the stale "Do Now" rows 3-6 were each checked against `src/` and marked done (repeat `create`/`update` types + `WeakMap` binding map; `show`; `classToggle`/`className`; `createDebugPlugin`). "Optional Build Step" marked superseded, with the reasoning given here.
  - **Not done:** the "HTML-first, JSX-optional" tagline. It describes a layer that does not exist and that Phase 4 has not ratified; adopt it only when R13/R14 ship.

- Mark "Optional Build Step (Future Idea)" (the Babel pass turning auto-tracked effects into explicit deps) as **superseded**: since v2.3, effects reuse their subscriptions and allocate nothing on stable re-runs (decision "Why Effects Reuse Their Subscriptions Across Runs"), so the pass would buy almost nothing. Point to Phase 4 instead.
- Refresh the stale "Do Now" table (several items are long done).
- Adopt the tagline **"HTML-first, JSX-optional."** once R13/R14 ship.

### R18. Re-measure the Code Verbosity challenge

- [ ] Status: blocked on Phase 4 (2026-10-26).

After Phase 4, rebuild the debug-demo comparison (vanilla vs Lume HTML vs Lume JSX vs Lume `html`) and update the table in `VISION.md`. Close the challenge only if Lume's line count beats vanilla.

---

## Phase 6 — Candidates from the Velotype review and the verification pass (2026-10-27)

Budget context for every item here: the all-in-one `lume.global.js` bundle is at **7.96 / 8.00 KB** on `main` (2026-10-28; it was 7.93 on `feat/roadmap-backlog` before 942863a), and every addon byte also lands in it. Items that add bytes are blocked until the global budget question (see Phase 4 / R11) is decided.

### R19. Document the `repeat()` `create()` stale-item closure

- [x] Status: **shipped on `main`** (df5ecf4, 2026-10-28): `docs(repeat): warn that create() listeners see the row's first item`.

**What:** Warn in the docs that a listener set up in `create()` closes over the item from the row's **first** render, and show the safe pattern.

**Why (executed 2026-10-27):** with `create: (item, el) => el.addEventListener('click', () => clicked = item.name)` and `update` writing `item.name`, replacing the array immutably with a new object for the same key makes the row **show** `new` while the click handler **reads** `old`. Nothing in `docs/api/addons/repeat.md`, `docs/guides/lists.md` or `AGENT_GUIDE.md` mentions it. The recommended "create + update" example in `repeat.md` is only correct because it reads `todo.id` (the stable key) and looks the current item up from the store.

**How:** one paragraph plus a corrected snippet in `docs/api/addons/repeat.md` ("in `create()`, read only the key; look up the current item from the store when the event fires"), a line in `docs/guides/lists.md`, and a rule in `AGENT_GUIDE.md` (agents will write the stale version). Regenerate `llms.txt`/`llms-full.txt`.

**Artifacts:** docs only (CHANGELOG optional).

### R20. Real-browser smoke tests in CI

- [x] Status: **shipped on `main`** (fe9afca `ci: run browser smoke tests in headless Chromium`, 762bbe3 `test(e2e): warn on console errors across every example page`), 2026-10-28.

**What:** A small Playwright suite that loads a few `examples/` pages in headless Chromium and asserts the core flows: `bindDom` text and two-way input, `repeat()` keyed updates and `select`, `stringAttr` URL filtering, `persist` round-trip.

**Why:** Lume's CI is jsdom-only (executed: no browser in `.github/workflows/ci.yml`), and `CLAUDE.md` already lists "jsdom-only tests" as a gotcha. The `stringAttr('data')` hardening shipped without its browser behavior verified because jsdom cannot show it (see R7's outcome). Velotype runs its whole suite in headless Chrome [traced].

**Limits to state in the decision/README:** Chromium alone does not prove the Chrome 80 / Firefox 74 / Safari 13.1 floor; that stays "by discipline and review". Keep the suite small so CI stays fast.

**Artifacts:** Build/CI row of the matrix (tests, workflow job); no `src/` change. `@playwright/test` as a dev dependency only.

### R21. `repeat()` delegated row `on` option

- [ ] Status: **blocked on the global bundle budget**; do R19 first.

**What:** `on: { click: (event, item, index, el) => ... }`: one listener per event type on the container, resolving the row from `event.target` and passing the **current** item and index.

**Why:** fixes the R19 footgun structurally (handlers always see the current item) and removes per-row `create()` wiring in template mode. Modeled on Velotype's `RenderTemplateArray` `on` option [traced]. This is a correctness/DX item, **not** a performance one: R9 measured per-element listener cost as noise.

**Open design points:** bubbling events only (document it); which element counts as the row when rows are nested; interaction with `stopPropagation()` inside rows; byte cost against the global budget, measured before building.

**Artifacts:** full "new public API" row, including a decision entry.

### R22. Async-data helper (candidate only)

- [ ] Status: **candidate; do not build without demand evidence and a budget decision.**

**What:** A helper that drives a store through `pending` / `resolved` / `rejected` for a `fetch`-style source, where only the newest load wins and older loads are aborted, so markup can bind `data-show="status"` etc.

**Why it is here:** Lume has nothing like it (executed: no `AbortController`/`AbortSignal` anywhere in `src/`); Velotype's `AsyncRenderObject` covers exactly this [traced]. **Why it is not scheduled:** no evidence users need it in the library rather than in a few lines of app code, and any addon bytes also land in the 7.96 / 8.00 KB global bundle. Reopen with concrete demand (issues, examples that hand-roll it) and a measured byte cost.

### R23–R25. Documentation gaps found while verifying `feat/roadmap-backlog`

- [x] Status (2026-10-28): **R23 and R24 shipped on `main`** in d5f964c. **R25 was not a real gap**: `docs/api/addons/repeat.md` has said "When the list comes from a `computed()`, pass the store that holds the selection ... Without it `repeat()` throws" since the original `select` commit (ec0425b, now bec390e). R23 was half-documented too (the `5` vs `'5'` example existed; d5f964c added the type and DOM-string explanation). Both mistakes came from grepping for a literal (`select.store`, `strict`) instead of reading the section; see the retrospective.

- **R23:** `select` compares with `===`, so `selectedId: '2'` against item key `2` selects nothing, silently (executed). Keys read from the DOM are strings. Add one line to `docs/api/addons/repeat.md` and the `select` JSDoc.
- **R24:** `<span data-bind="user.name">Loading…</span>` with `user: null` used to keep "Loading…" (dead binding plus a warning) and now renders empty at bind time (executed). Consistent with flat `undefined` values, but visible for server-rendered pages. Add one line to `docs/guides/ssr-hydration.md` and to the nested-path entry under `### Changed` in `CHANGELOG.md`.
- **R25:** `select` on a `computed()` list without `select.store` throws `source.$subscribe is not a function` (executed). The clearer message was dropped to save bytes, which is acceptable at 7.93 / 8.00 KB; document that `select.store` is required for `computed()` sources in `docs/api/addons/repeat.md`.

### R26. Decide whether `list.0.name` index paths are a supported pattern

- [ ] Status: **needs a maintainer decision** (2026-10-28). Evidence: [`data-bind="list.0.name"`: supported, but never decided](#data-bindlist0name-supported-but-never-decided-executed-2026-10-28).

**What:** Index paths have worked since 2025-10-03 by accident and became documented and tested only in 942863a. No decision entry ever weighed them. Pick one:

1. **Support them, with the caveats written down:** a positional binding follows the index, not the item; in-place array changes (`reverse`, `sort`, `splice`) are not seen; replace the array to re-link; prefer `repeat()` for lists. Fix the warning for a missing index (today: "not reactive at \"0\""). Zero or near-zero bytes.
2. **Discourage them:** keep the behavior (removing it breaks working pages, as the R2 regression showed), but document index paths as "works, not recommended" and point to `repeat()` or a keyed nested `state()`.

**Recommendation:** option 1, as a short dated amendment to the nested-path decision entry plus one paragraph in `docs/api/core/bindDom.md`. The behavior already exists, people evidently use it (942863a was written because its absence broke real patterns), and stating its limits costs nothing; pretending it is unsupported does not make it go away. Byte check needed for any warning-text change: `global` has 0.04 KB left.

**Artifacts:** decision amendment, API doc paragraph, a test asserting the in-place-reorder limit, CHANGELOG only if the warning text changes.

---

## Rejected — do not re-propose without new evidence

| Idea | Seen in | Why rejected |
|---|---|---|
| Our own JSX compiler | Gea | ~15k LOC, becomes a weaker Solid; the JSX runtime (R13) gets the adoption benefit without it |
| Virtual DOM / re-rendering components | — | Contradicts "Why No Virtual DOM?"; components run once |
| Expressions in attributes (`{{ }}`, `:attr="a + b"`) | Regor | Template-injection class of bugs; `AGENTS.md` hard constraint |
| Automatic deep reactivity / intercepted array methods | Gea, Regor | Ratified "nested state must be explicit"; Gea stamps symbols on user objects, Regor rewrites them in place |
| Synchronous flushing / re-render on every write | Regor, Velotype | Exposes intermediate states and re-renders once per write; microtask coalescing is ratified |
| "Lock" tracking after stable runs | Gea | Unsound — conditional deps go stale; Lume's run-generation sweep already gives zero-alloc steady state safely |
| Synchronous "direct observers" bypassing batching | Gea | Benchmark-specific special case; R8 gets the O(1) result without breaking batching |
| Global scheduler | Gea | Ratified against ("Why Per-State Batching"); Gea's shared flush loop shows the freeze hazard |
| Non-escaping `html` tag | Regor | R14 must be safe by construction |
| MutationObserver-based auto-cleanup | external suggestion | Global machinery, fuzzy ownership; Lume cleans what it owns |
| Setting any prop that has a DOM setter (incl. `innerHTML`), unfiltered `href` | Velotype | Spread props become HTML injection and `javascript:` URLs pass through; R13 must use an explicit policy, a denylist, and the URL filter on the property path |
| Re-rendering by replacing elements / rebuilding subtrees (`refresh()`) | Velotype | Loses input state and focus, unmounts every child; Lume updates in place through fine-grained effects |
| Explicit per-value reactive wrappers instead of auto-tracking | Velotype | Pushes complexity into components; `state()` + `effect()` already exist |
| Global id registry for ownership | Velotype | Only correct when every DOM removal goes through the library; R12 should own scopes through closures |

## Already done — don't rebuild

| Proposed as new | Where it already lives |
|---|---|
| Dependency-tracked `computed()` with `Object.is` dedupe, conditional deps, disposal | `src/addons/computed.js` (built on `effect()` auto-tracking) |
| Keyed, DOM-stable `repeat()` with minimal moves | `src/addons/repeat.js`; amendment "minimal-move reordering" under "Why No Virtual DOM?"; identity tests `tests/addons/repeat.test.js:1223` |
| Idempotent disposers / cleanup on removal | `$subscribe` unsubscribe index guard (`src/core/state.js`), `computed.dispose()`, `repeat()` `create()`-returned cleanup |
| Effects that don't re-subscribe on stable runs | `src/core/effect.js`; decision "Why Effects Reuse Their Subscriptions Across Runs" |
| Cross-store batching | `src/core/batch.js` |
| URL scheme filtering | `src/handlers/stringAttr.js` |
