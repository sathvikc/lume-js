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
