# 11 — feat(build): `lume-js/state` — the universal, DOM-free entry

| | |
|---|---|
| **Type** | Feature (packaging — additive, non-breaking) |
| **Files changed** | `src/state.js` + `src/state.d.ts` (new), `package.json`, `scripts/build.js`, `scripts/check-size.js`, `vite.config.js` |
| **Tests** | `tests/state-entry.test.js` (5 tests, run in **plain Node** — no DOM) |
| **Measured size** | **1.45 KB gzipped** (budget: 1.75 KB) |
| **Breaking?** | No — `lume-js` is unchanged; this adds an entry |

## What it is

```js
// Node, Deno, Bun, workers, CLI tools — anywhere JS runs:
import { state, batch } from 'lume-js/state';   // 1.45 KB

// Browsers with DOM binding:
import { state, bindDom, effect, batch } from 'lume-js';   // 2.66 KB
```

The original architectural goal (VISION.md "Future State") was a state-only
core that works in Node/CLI, with everything else as addons — kept merged
into one entry "for easy access". This change makes both true at once:

- **`lume-js/state`** is the universal kernel: `state`, `batch`,
  `withReadObserver`. No DOM APIs anywhere in its dependency graph.
- **`lume-js`** stays exactly what it was — the browser DX bundle. No
  imports break, no docs change meaning.

## Why an entry, not a reorganization

The source was *already* layered correctly (state imports nothing upward;
effect/bindDom sit on its public seams). What was missing was packaging:

1. **`package.json` exports** — `"./state"` → `dist/state.mjs` + `src/state.d.ts`.
2. **Build artifacts** — `dist/state.mjs` (npm) and `dist/state.min.mjs`
   (self-contained CDN build), produced by the same pipeline as the others.
3. **A CI budget** — `state.min.mjs ≤ 1.75 KB` in `check-size.js`, so the
   kernel can never silently grow past its promise.

No-build users are the audience that can't tree-shake — for them the
universal core has to exist *as a file*, not as a theoretical import subset.
Now it does:

```html
<script type="module">
  import { state, batch } from 'https://cdn.jsdelivr.net/npm/lume-js/dist/state.min.mjs';
</script>
```

## Why batch is in the kernel (and how it stays removable)

Decided in review (see `design-decisions.md` entry "Why batch() is part of
the kernel"): batching is write-scheduling, write-scheduling is state's job,
and the state-only consumers (tests, servers, CLIs) are exactly who wants a
synchronous flush. Cost: +0.37 KB over bare state (measured 1.08 → 1.45).

The door to making it optional later stays open **without code changes
now**: `state.js` touches batching through a single seam
(`enqueueIfBatching`), so a future `state-lite` artifact (hook compiled out)
or a per-store scheduler option would be additive — no breaking change.

## Proof of universality

The test suite for this entry runs under `@vitest-environment node` — it
asserts `typeof document === 'undefined'` and then exercises `state`,
`$subscribe`, `batch`, and `withReadObserver` in that environment.

## How to verify

```bash
npx vitest run tests/state-entry.test.js
npm run size    # state.min.mjs 1.45 KB / 1.75 KB budget
node -e "import('./dist/state.min.mjs').then(m => console.log(Object.keys(m)))"
```
