# 09 — refactor(core): extract batch machinery into `core/batch.js`

| | |
|---|---|
| **Type** | Refactor (no behavior change) |
| **Files changed** | `src/core/batch.js` (new), `src/core/state.js`, `src/index.js` |
| **Tests** | Unchanged — all 420 pass; coverage stays 100% on both files |
| **Breaking?** | No — public API identical (`import { batch } from 'lume-js'`) |

## Why

The repo's CI enforces a per-file maintainability budget
(`scripts/complexity.js`: MI ≥ 50). After change 05 added the batch
machinery, `state.js` slipped to **MI 48.3** — the file was doing two jobs.

## What moved

`core/batch.js` now owns the batching concern: `batchDepth`, the
`batchedStates` queue, the wave-flush loop, the public `batch()`, and the
shared `MAX_FLUSH_ITERATIONS` constant.

The dependency direction is the important design point:

```
state.js  ──imports──▶  batch.js          (never the other way)
```

`batch.js` never imports `state.js`, so there is no cycle. `state.js`
participates through a single call in its scheduler:

```js
function scheduleFlush() {
  // Inside batch(): the batch captures this state's flush handle and
  // flushes synchronously at the end — skip the microtask.
  if (enqueueIfBatching(batchHandle)) return;
  ...
}
```

`enqueueIfBatching(handle)` is the entire contract between the two modules:
returns `false` (no batch active — proceed with the microtask) or captures
the handle and returns `true`. The handle still exposes only the three
drain-style flush steps — no live queues.

## Result

- Both files comfortably back inside the complexity budget; each owns one
  concern (`state.js`: reactivity + per-store scheduling; `batch.js`:
  cross-store grouping).
- Bundle impact: ±0.02 KB gzip (chunk-boundary noise), still 88% of budget.
- `index.js` imports `batch` from its real home.

## How to verify

```bash
node scripts/complexity.js   # ✅ All files within complexity budget
npx vitest run --coverage    # 420 passed, 100% everywhere
```
