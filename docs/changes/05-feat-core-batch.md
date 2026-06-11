# 05 — feat(core): `batch()` — group writes across stores, flush once

| | |
|---|---|
| **Type** | Feature (core API) |
| **Files changed** | `src/core/state.js`, `src/index.js`, `src/index.d.ts` |
| **Tests** | `tests/core/batch.test.js` (15 tests) |
| **Example** | `examples/batch/` — live effect-run counter, with/without batch |
| **API docs** | `docs/api/core/batch.md` |
| **Breaking?** | No — pure addition; nothing changes unless you call it |

## What it is

```js
import { state, effect, batch } from 'lume-js';

const price    = state({ value: 100 });
const quantity = state({ value: 2 });
const shipping = state({ value: 5 });

effect(() => {
  total.textContent = price.value * quantity.value + shipping.value;
});

batch(() => {
  price.value = 80;
  quantity.value = 3;
  shipping.value = 0;
});
// effect ran exactly ONCE (not three times), synchronously, seeing 240
```

## The problem it solves

Lume's write batching is **per store** (each store coalesces its own writes
into one microtask flush). That is the right default — but it means an effect
reading N stores re-runs N times when all N change in one action, and the DOM
shows its final state only after a microtask. Both properties are documented
per-state design, and both are exactly what you *don't* want when one user
action touches several stores.

`batch()` is the explicit, opt-in escape hatch:

- **Cross-store dedupe** — every mutated store's queued effects are collected
  into one `Set` per flush wave; an effect queued by three stores runs once.
- **Synchronous flush** — by the time `batch()` returns, subscribers and
  effects have run. No `await Promise.resolve()` in tests or imperative code.
- **Final values only** — `store.x = 1; store.x = 2; store.x = 3` inside a
  batch notifies subscribers once, with `3` (same as microtask batching).

## How it works (implementation notes for review)

The design goal was: **no global scheduler object, no import side effects, no
exposure of internal queues.** (These were the main problems with the earlier
`feature/pluggable-scheduler` approach — see the branch review.)

1. `state.js` already had a flush routine; it is now factored into three named
   steps — `runBeforeFlushHooks()`, `notifySubscribers()`, `takeEffects()` —
   used by both the microtask path and `batch()`. **No behavior change** to
   the microtask path.
2. Each store exposes those three steps to `batch()` through a private
   `batchHandle` object. The live queues (`pendingNotifications`,
   `pendingEffects`) are never handed out — `takeEffects()` *drains*, callers
   can't mutate scheduler state.
3. Module-level `batchDepth` counter + `batchedStates` set. While
   `batchDepth > 0`, `scheduleFlush()` enqueues the store's handle instead of
   queuing a microtask.
4. When the outermost `batch()` returns, waves run until quiet: notify all
   enqueued stores → run the deduplicated union of their effects → writes made
   during the wave re-enqueue stores for the next wave. Capped at 100 waves
   with a console error (same cap as the microtask flush), and the runaway
   wave is dropped so a future unrelated batch doesn't inherit it.

Everything lives in `state.js` — batching *is* a scheduling concern, and the
machinery is ~60 lines. `batch` is exported from the package root
(`import { batch } from 'lume-js'`) and is tree-shakeable when unused.

## Edge cases covered by tests

| Case | Behavior |
|------|----------|
| Nested `batch(batch(fn))` | absorbed; one flush at the outermost end |
| `fn` throws mid-way | writes before the throw flush, error propagates, scheduling left clean |
| Effect mutates another store during the flush | joins the same batch (next wave), still deduped |
| Self-perpetuating effect | capped at 100 waves + console error; states stay usable |
| Store with a pre-batch pending microtask, also written in the batch | everything flushes synchronously in the batch; the later microtask finds nothing to do |
| Store *not* touched by the batch | unaffected — flushes on its own microtask as usual |
| Async `fn` | console warning; writes before the first `await` are batched, later ones aren't |
| `$beforeFlush` hooks / `withPlugins` `onNotify` | run during the batch flush, before subscribers |

## Why this is in core (and the time-slicing work isn't)

The `feature/pluggable-scheduler` branch explored a much bigger surface:
global scheduler replacement, time-slicing, priority lanes, AbortSignal. The
review found real value in **synchronous cross-store batching** and real
hazards in the rest (import-time scheduler swap vs `sideEffects: false`,
abort-path store freeze, SSR crashes). This commit ships the valuable core in
~60 lines with zero global mutable hooks. Time-slicing can return later as an
explicitly experimental addon built *on top of* `batch()` — nothing here
precludes it.

## How to verify

```bash
npx vitest run tests/core/batch.test.js
npm run dev   # → open /examples/batch/ and click both buttons
```
