# Change Write-ups — branch `claude/next-level`

One file per commit, in commit order. Each write-up covers: what changed and
why, before/after examples, design decisions, edge cases, and how to verify.
Every commit ships its code, tests, type definitions, API docs, changelog
entry, and (where it helps) a live example — reviewable in isolation.

## Reading order

| # | Commit | Type | Summary |
|---|--------|------|---------|
| [01](01-fix-effect-cross-store-tracking.md) | `fix(core)` | **Effect tracking collided across stores** — `effect(() => a.value + b.value)` silently never subscribed to `b`. Per-proxy `WeakMap` tracking fixes the library's core promise. |
| [02](02-fix-explicit-deps-coalescing.md) | `fix(core)` | **Explicit-deps effects ran once per changed key** — now coalesced to one run per tick (matching auto-tracking), with disposal-safe scheduling. |
| [03](03-fix-subscriber-cap-consistency.md) | `fix(core)` | **The 1000-subscriber DoS cap didn't apply to effects** and failed silently. One shared registration path, loud `console.error` at the cap. |
| [04](04-fix-reactive-brand.md) | `fix(core)` | **The reactive brand symbol was dead code** (unique per store, readable by no one). Now a shared registry symbol; `isReactive()` is brand-first and effect-safe. |
| [05](05-feat-core-batch.md) | `feat(core)` | **`batch()`** — group writes across stores, flush once synchronously, multi-store effects run exactly once. No global scheduler, no import side effects. |
| [06](06-feat-template-repeat.md) | `feat(addons)` | **Template-driven `repeat()`** — keyed lists from a standard `<template>` element with per-item `data-bind` paths. Kills the imperative-DOM boilerplate VISION.md calls the hardest problem. |
| [07](07-feat-on-handler.md) | `feat(handlers)` | **`on()`** — declarative event wiring via `data-on*` attributes; functions live in state, wiring lives in HTML. No expressions, no eval. |
| [08](08-feat-persist-addon.md) | `feat(addons)` | **`persist()`** — localStorage/sessionStorage sync with allowlist hydration, coalesced writes, and contained failures. From the VISION roadmap. |
| [09](09-refactor-batch-extraction.md) | `refactor(core)` | **Batch machinery extracted to `core/batch.js`** — restores `state.js`'s maintainability budget; one-way dependency, identical behavior. |
| 10 | `docs` | This index, README refresh (badges, `batch`/template/`on`/`persist` sections), changelog test summary. |
| [11](11-feat-state-entry.md) | `feat(build)` | **`lume-js/state`** — the universal DOM-free entry: state+batch at **1.45 KB gz** with its own CI budget. Additive; `lume-js` unchanged. |
| 12 | `docs(design)` | design-decisions.md ratification entries for every change on this branch (incl. the batch-optional escape hatch and the `data-on*` amendment); VISION.md brought current. |
| 13 | `docs` | README universal/DOM positioning (entry picker, badges), new [universal-core guide](../guides/universal-core.md) with runnable Node examples. |
| 14 | `chore` | **AGENTS.md** — the build-process contract: artifact matrix (when decision entries/examples/tests are required), hard constraints, quality gates, doc-ownership table. |
| 15 | `fix(addons)` | **Review round 1:** persist's default storage used `globalThis.localStorage` — crashes at setup where touching localStorage throws (blocked iframes). Now guarded + floor-safe. |
| 16 | `fix(addons)` | **Review round 1:** template mode consumed the source `<template>` (user markup deleted; re-bind threw). Reconciliation/cleanup preserve it, incl. wrapper-nested templates. |
| 17 | `docs` | **Review round 1:** browser-support table claimed Chrome 49+/Safari 10+ while the source ships un-transpiled ES2020 — corrected to Chrome 80+/Firefox 74+/Safari 13.1+/Edge 80+; floor codified in AGENTS.md. Includes the resolveTemplate complexity extraction. |
| 18 | `fix(core)` | **Review round 2 (HIGH×2, one root cause):** subscriber write-backs to already-notified keys were silently lost (live-Map iteration + trailing clear), and `batch()` opened inside a subscriber re-delivered in-flight notifications. Notifications now drain before delivery on both flush paths. |
| 19 | `fix(addons)` | **Review round 2 (HIGH):** `repeat()` cleanup used `replaceChildren` (Chrome 86+) — above the ratified Chrome 80 floor. Manual removal also stops re-parenting a user-moved template. |
| 20 | `fix(addons)` | **Review round 2 (MED):** `persist({ keys: [] })` silently persisted the whole store — explicit arrays now respected as-is; plus a warning when two instances manage one storage entry. |
| 21 | `fix(types)` | **Review round 2 (MED):** `lume-js/state` types pulled `HTMLElement` via `index.d.ts` — dependency inverted; `state.d.ts` is the self-contained DOM-free source of truth (tsc-verified under `lib: ["ES2020"]`). |
| 22 | `chore(tests)` | **Review round 2 (LOW):** `restoreMocks: true` so failing assertions can't leak spies across tests; descriptor-safe `localStorage` restoration. |
| 23 | `feat(examples)` | **`examples/batch/` upgraded to a live benchmark** — 200 stores, 100 bursts, measured on-page (aggregate-effect run counters, frame-health meter, fair-play notes); the 200:1 dedupe ratio verified by probe. |
| 24 | `docs` | This semver classification table; index bookkeeping. |

## Release classification (semver)

Per-commit classification against [semver](https://semver.org): **MINOR** = new
backward-compatible API, **PATCH** = backward-compatible fix/internal, **—** =
no release impact (docs, tests, examples, process). There are **no MAJOR
(breaking) changes on this branch** — merging it is one **MINOR release:
v2.2.1 → v2.3.0** (the version the decision-log entries already reference).

| Commit | Subject | Semver |
|--------|---------|--------|
| `573f5bf` | fix(core): track effect dependencies per store, not per key name | PATCH |
| `01b75bc` | fix(core): coalesce explicit-deps effect runs to once per tick | PATCH ¹ |
| `31ffe94` | fix(core): apply subscriber cap to effect subscriptions, fail loudly | PATCH ² |
| `6b3b591` | fix(core): make the reactive brand a real, shared symbol | PATCH |
| `9e8394b` | feat(core): batch() — group writes across stores, flush once | **MINOR** |
| `9403d83` | feat(addons): template-driven repeat() | **MINOR** |
| `da82559` | feat(handlers): on() — declarative event wiring | **MINOR** |
| `108fb1e` | feat(addons): persist() — storage sync | **MINOR** |
| `8d5e75f` | refactor(core): extract batch machinery into core/batch.js | PATCH (internal) |
| `f49bbe6` | docs: change-by-change review index, README refresh | — |
| `14e11bd` | feat(build): lume-js/state — universal DOM-free entry | **MINOR** |
| `cb7ee34` | docs(design): ratify v2.3 decisions; VISION current | — |
| `a18d834` | docs(readme): universal/DOM positioning + guide | — |
| `553b9b1` | chore: AGENTS.md — the build-process contract | — |
| `9785a55` | fix(addons): persist storage default — survive SecurityError | PATCH |
| `6719097` | fix(addons): repeat template mode preserves the source template | PATCH |
| `7be928b` | docs: correct browser-support floor to ES2020 baseline | — ³ |
| `177ec55` | fix(addons): extract resolveTemplate (complexity budget) | PATCH (internal) |
| `027c445` | fix(core): drain pending notifications before delivering | PATCH |
| `3e51625` | fix(addons): repeat cleanup without replaceChildren | PATCH |
| `07dad40` | fix(addons): persist honors keys: [] + duplicate warning | PATCH |
| `2cdb60c` | fix(types): lume-js/state type-checks without lib.dom | PATCH |
| `46ea5c7` | chore(tests): restoreMocks + descriptor-safe restoration | — |
| `0036f56` | feat(examples): batch() live benchmark | — ⁴ |

**Tally:** 0 MAJOR · 5 MINOR · 12 PATCH · 7 no-impact → **v2.3.0**.

Release-note footnotes (behavior visible to some users, all ratified in
design-decisions.md):
¹ explicit-deps effects now re-run one microtask later and once per tick.
² the 1000-listener cap now also applies to effect subscriptions, and logs
  `console.error` instead of a warning.
³ docs-only, but it *narrows the claimed support range* — worth a headline
  line in the release notes.
⁴ examples aren't part of the published package — no release impact.

## The through-line

Every change serves the same thesis — **web standards are already enough**:

- The three features attack the verbosity gap with frameworks using only
  platform primitives: `<template>` for structure, `data-*` attributes for
  events, `Storage` for persistence. After this branch, a todo app is a
  `<template>` in HTML plus a store with functions — no `createElement`, no
  `addEventListener` soup, no hand-rolled localStorage code.
- The four fixes make the existing core honest: multi-store apps actually
  track, both effect modes behave the same, the DoS cap can't be bypassed,
  and `isReactive` has a real brand.
- `batch()` ships the *valuable* 30% of the earlier
  `feature/pluggable-scheduler` branch (reviewed separately) without its
  hazards: no last-writer-wins global scheduler, no import-time side effects
  fighting `sideEffects: false`, no exposure of internal queues.

## Numbers

| Metric | main (v2.2.1) | this branch |
|--------|---------------|-------------|
| Tests | 355 | **425** (+70) |
| Coverage | 100% (statements/branches/functions/lines) | **100%** (unchanged gate) |
| Core `index.min.mjs` (gzip) | 2.23 KB | **2.66 KB** (+0.43 KB for `batch()` + fixes; budget 3 KB) |
| Universal kernel `state.min.mjs` (gzip) | — | **1.45 KB** (state+batch, DOM-free; budget 1.75 KB) |
| Handlers bundle (gzip) | ~1.1 KB | 1.19 KB (`on()` is ~0.1 KB of it) |
| New opt-in addon weight | — | `persist()` ~0.5 KB, template mode ~0.4 KB — pay only if imported |

## Not included, deliberately

- The time-slicing / priority / AbortSignal work from
  `feature/pluggable-scheduler` — three confirmed bugs and a structural
  design problem were found in review; the cross-store batching it was built
  for ships here as `batch()`. Time-slicing can return as an explicitly
  experimental addon on top of this foundation.
- Two-way bindings inside `repeat` templates — would require per-item stores;
  conflicts with "explicit nested states". Documented as one-way snapshots.
- Cross-tab sync in `persist()` (`storage` event) — clean future option,
  noted in its write-up.
