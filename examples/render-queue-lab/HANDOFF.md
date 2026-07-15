# render-queue-lab — session handoff

Read this first if you are picking up this research in a new session. It is the index of **what has been tried, what was found, and what has NOT been tried yet** — so you can continue without re-deriving anything and without re-running experiments that are already done. The full analysis is in [`FINDINGS.md`](FINDINGS.md); raw numbers are in [`results/`](results/).

## Ground rules for this branch (read this — it is deliberately permissive)

This is a **pure research/experiment branch**. Explore freely:

- **You may modify `src/` directly.** Fork a kernel file, patch `state.js`/`batch.js`/`effect.js`, add an experimental core primitive — whatever tests a hypothesis fastest. You do **NOT** need the AGENTS.md artifact matrix (tests + `.d.ts` + docs + changelog + decision entry) for experiments here; that is only required if a change later graduates to a real shipping branch off `main`. Mark experimental src edits with a `// EXPERIMENT:` comment so they are obvious, and note them in this file.
- **Prefer reusing the scripts below over writing new ones** — writing a bespoke measurement script per experiment burns the session budget fast. `matrix.mjs` + `profile.mjs` + `run.mjs` cover almost everything via CLI args.
- Only hard limits: don't push to `main` or `feature/render-queue`; keep work on this branch; keep `HANDOFF.md` current so the next session doesn't repeat you.

`renderQueue` is settled (KILLed) — you never need to revisit it; it stays imported only so the lab has a `mode=rq` baseline to compare against.

**Experimental `src/` edits currently applied on this branch:** `src/core/state.js` carries the Round-6 **no-subscriber fast-path** (marked `// EXPERIMENT:`) — the `set` trap skips all notify/flush work when a store has zero listeners and no beforeFlush hooks. It's behaviourally transparent (all 488 tests pass) and is a candidate to graduate to `main` with the full artifact matrix. To measure *without* it, `git stash -- src/core/state.js` and re-run. Nothing else in `src/` is patched.

## Reusable scripts — USE THESE instead of writing a new one

| script | what it does | example |
|---|---|---|
| `run.mjs` | one measurement case, all flags, `--out` JSON | `node run.mjs --mode smart --regime storm --cells 3000 --nodot --type` |
| `matrix.mjs` | **the workhorse** — cross-product of modes × regimes × cells, prints a metric table + JSON. Add a mode to `main.js` and it's instantly runnable | `node matrix.mjs --modes off,pull,smart --regimes storm,dashboard --cells 1000,3000 --nodot --type` |
| `profile.mjs` | CDP CPU profile → self-time % by function (how the kernel write-path floor was found) | `node profile.mjs --mode sliced --regime dashboard --cells 3000` |
| `headroom.mjs` | fps ceiling + thread-free % across cell counts | `node headroom.mjs storm 20` / `dashboard 1` |
| `round2.mjs` | `starve` \| `compare` \| `fidelity` sub-experiments | `node round2.mjs starve` |

`matrix.mjs` metric columns: `in.med in.p95 fps worstBlock free% maxStale peakBL starved conv busyFrac prod slice`. All modes/flags are wired through `runCase` in `run.mjs`, so any new mode or `main.js` metric surfaces automatically once added to the snapshot + result. Reminder: `worstBlock`/`free%` are throttle-inflated (relative-only); lead with `in.med`.

## The question

Can Lume keep the UI responsive (input smooth, pixels current) when thousands of reactive cells update per frame under heavy CPU load (DevTools 20× throttle)? The frozen `feature/render-queue` addon (`renderQueue`) was the first attempt; the maintainer wants the whole direction stress-tested and, where possible, improved or reinvented.

## How to run (environment)

```bash
npm run dev -- --port 5199 --strictPort           # serve examples (the lab reloads via HMR on edit)
PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 npm i --no-save playwright-core   # research-only, not a project dep
```
Browser: `/opt/pw-browsers/chromium` via `playwright-core`. Throttle: CDP `Emulation.setCPUThrottlingRate {rate:20}`, verified every run with a busy-loop probe (embedded in each result JSON). Headed (real compositor): wrap the node command in `xvfb-run -a`.

Lab page: `index.html` + `main.js`, configured by URL query. To add a technique: add a `mode` branch in `main.js` `wire()` (+ any teardown in `clearWiring`, any metric in `snapshot`), then run it via `matrix.mjs --modes <yourmode>,...` — no driver changes needed.

## Modes implemented in the lab (URL `?mode=`)

| mode | what it does | verdict |
|---|---|---|
| `off` | baseline: one `effect()` per cell, DOM write synchronous in the flush | the bar |
| `rq` | the frozen `renderQueue` addon (tiers, budget, IO, input-preempt) | KILL — see below |
| `simple` | ~15-line rAF coalesce: mark dirty, one rAF applies ALL dirty | fair, no freeze, no budget |
| `adaptive` | synchronous applies until a janky frame, then defer | no better than `off` anywhere |
| `cv` | `off` + CSS `content-visibility:auto` | best for sparse/large grids (free) |
| `bounded` | round-robin CURSOR drain (the maintainer's idea) | fixes rq's starvation; fair; bounded staleness |
| `pull` | NO per-cell effects — one rAF sweeps cursor, reads current state, paints changed within budget | attacks the flush; best in storm |
| `smart` | `pull` + input-reserved dynamic budget (small while interacting, 5× when idle) | best input of the pull family |
| `sliced` | LAYER 3 — also time-slice the WRITE pass: producer buffers latest value, budgeted loop applies+paints a slice/frame | chunking works; kernel write path is the floor |
| `plain` | pull renderer over a PLAIN array — no `state()`, producer writes raw memory; scheduling identical to `pull` | the theoretical write floor (~0% kernel); confirms how little is left under the fast-path |
| `smartcv` | `smart` pull renderer on a `content-visibility:auto` grid (Layer 1 + Layer 2 stacked) | BEST responsiveness measured — the layers compose (see Round 7) |

URL knobs: `regime` (`storm`/`dashboard`/`burst`/`quiet`), `cells`, `budget`, `churn`, `dot` (0 removes the jank-dot render artifact — **always use dot=0 for real numbers**), `text` (0 = paint-only apply), `render` (0 = keep flush, skip DOM writes — isolates rendering cost).

## What has been TRIED and FOUND (do not redo)

1. **The freeze is real and root-caused.** `renderQueue` drains ~16 cells/frame (2ms budget under 20×) while a storm re-dirties thousands; backlog pins, staleness grows unbounded. Budget tuning (2→32ms) does not fix it. *(FINDINGS "The freeze".)*
2. **Starvation bug in `renderQueue`.** Under uniform re-dirty order (a grid iterating cells 0..N — the common case) the Set drain re-adds every entry in the same order, so it repaints ~8 front cells up to 13× while **2984/3000 never paint**. The addon's no-starvation test only re-dirties one entry, so it ships green. `bounded`/`pull`/`simple` do not starve. *(FINDINGS Round 2; `round2.mjs starve`.)*
3. **renderQueue's input win is ~1.5× at best (median), never ≥5×**, and it freezes pixels under sustained load. `content-visibility` (free CSS) beats it 2–3× in realistic regimes. **Verdict: KILL** the shipped addon. Also 0.37 KB over the 8 KB all-in-one budget (budget kept at 8; the silent 8→9 raise was reverted). *(FINDINGS Rounds 1–2.)*
4. **Prototype's 7.4× vs my ~1.5×** = fixed-floor : spreadable-apply ratio. Headed (xvfb) did NOT change it — floor persists in both paths, so it is not a headless artifact. Residual caveat: both environments are ~5× slower natively than the prototype's machine, so on fast hardware the input benefit could be larger. Freeze/starvation are hardware-independent. *(FINDINGS Round 2/3; `round2.mjs fidelity`.)*
5. **fps ceiling.** Native, a full storm holds 60fps for only a few hundred cells; a dashboard ~1200. Rescheduling (pull/bounded/rq) does NOT raise the ceiling (same total work). Only **reducing work** raises it: `content-visibility` holds 60fps to ~2000 dashboard cells. *(FINDINGS Round 3; `headroom.mjs`.)*
6. **Main-thread free time.** Budgeted schedulers (pull/bounded) roughly HALVE the worst blocking task vs `off` — that (not fps) is what they buy. But nothing frees the thread from the WRITE pass. *(FINDINGS Round 3.)*
7. **`smart` (drop-stale + input-reserved budget)** had the best input of the pull family (burst: 1218ms vs 1486–1557ms fixed). Principle 2 works, but its ceiling is the write pass. *(FINDINGS Round 4; `smart.mjs`.)*
8. **Layer 3 (`sliced`): time-slicing the write pass.** Chunking WORKS at the JS level (producer 7ms, slice 16ms, budget-respected). But a CPU profile shows the real floor is the **Lume kernel write path** — `set` + `notifySubscribers` + `flushBatchedStates` ≈ **27% of active CPU**, O(N) in writes, even with ZERO subscribers. Chunking spreads it, doesn't reduce it; input at 3000 cells (~1155ms) ≈ pull/off. *(FINDINGS Round 5 / `results/layer3-summary.json`.)*
9. **Round 6 — the write-path floor is removed, two ways.** (a) **Kernel no-subscriber fast-path** (`src/core/state.js`, applied): the `set` trap skips notify/flush when a store has no listeners + no beforeFlush hooks. `pull` storm worst write-pass frame **156→16ms (~10×)**; profile kernel write path **~9%→~1.5%** (`notifySubscribers`/`takeEffects` vanish); **all 488 tests pass unchanged**. (b) **`plain` mode** (pull over a plain array, no `state()`): profile shows **~0% kernel write path** (97% `(program)`), `prod` ~8–16ms. The fast-path captures ~85% of the win *while keeping the reactive API*; plain buys only the last sliver by dropping reactivity. Neither raises the fps ceiling (still content-visibility) nor fixes input under a pure paint-bound storm — they remove the O(N) write floor Round 5 diagnosed. Use `prod` (worst write-pass frame), not input-delay (paint-dominated) or `worstBlock` (throttle-inflated). *(FINDINGS Round 6 / `results/round6-writepath-floor.json`, `exp1-fastpath.json`, `exp2-plain.json`.)*

## Measurement gotchas (learned the hard way — respect these)

- **`worstBlock`/Long-Tasks under CPU throttle is inflated** by throttle-inserted pauses (wall-clock ≠ CPU time). Use it only for *relative* comparisons under the same throttle. **Input-delay** (`performance.now() - event.timeStamp` in the handler) is the clean absolute metric.
- **The jank-dot animation is a huge confound** — it forces per-frame repaints scaling with DOM size (~4.7fps quiet at 3000 with dot vs 24.7 without). Always `dot=0`.
- **`page.keyboard.type` deadlocks** when a frame is multi-second (Playwright awaits the renderer per key). Inject keys fire-and-forget via CDP `Input.dispatchKeyEvent` instead (run.mjs does this).
- **Do NOT edit `main.js` while a run is in flight** — Vite HMR reloads the page and kills the run ("Execution context destroyed by navigation"). Edit between runs.
- **Do NOT `pkill -f chrome` from the Bash tool** — it destabilizes the sandbox shell. Let `runCase` close its own browser (it does, via try/finally).
- **The dev server dies periodically** (container churn / HMR). Re-`curl` it before each batch and restart if `000`.
- **CDP throttle drifts 12–36×** between single cases; trust multi-case sweep medians, not single A/Bs, and re-probe every case (drivers do).
- **The O(N) `currentBacklog` poll** used for convergence saturates the throttled thread — convergence numbers for pull/smart/sliced are unreliable; input numbers are fine.

## What has NOT been tried yet (next-session candidates)

1. ✅ **DONE (Round 6) — Kernel no-subscriber fast-path.** Applied in `src/core/state.js` (`// EXPERIMENT:`). Not just `notifySubscribers` — the whole `set`-trap notify/flush path is skipped when a store has no listeners + no beforeFlush hooks. `pull` storm write-pass frame 156→16ms; kernel write path ~9%→~1.5%; 488 tests pass. Next step for *this* one is graduation to `main` with the full artifact matrix, not more measurement. *(FINDINGS Round 6.)*
2. ✅ **DONE (Round 6) — Pull renderer over PLAIN data.** Added as `mode=plain`. Profile confirms ~0% kernel write path (the theoretical floor). Finding: after the fast-path (item 1) the reactive `pull` write pass is already within ~1–2× of plain, so bypassing `state()` buys only the last sliver — not worth losing reactivity for the churny layer. *(FINDINGS Round 6.)*
3. ✅ **DONE (Round 7) — `smart` + `cv` combined (`mode=smartcv`).** The layers compose: dashboard 3000, median input `off` 1887 → `smart` 1643 → `cv` 662 → **`smartcv` 515 ms** (fps 0.3→1.0), best of all four. Paint (not scheduling) is the bottleneck, so `cv` (paint culling) is the dominant lever and `smart` is a secondary multiplier that only surfaces once `cv` uncovers it; at 8000 cells `smart` *alone* is even worse than `off` (pull sweep overhead), while `smartcv` is ~6× better than `off`. *(FINDINGS Round 7 / `results/exp3-smartcv.json`.)*
4. **Recency-priority within the slice** (paint most-recently-changed first, with a fairness floor) — the "render the newest batch, drop older" half of principle 1 at sub-frame granularity. `bounded`/`pull` use index-order cursors; recency ordering is untested.
5. **Adaptive budget by measured sustainable rate** (grow/shrink the budget from recent frame timing), vs the current fixed 2ms/10ms input-reserved toggle. The "continuously measure how much we can sustain" idea is only crudely approximated.
6. **A clean freshness/convergence measurement** (fix the O(N) poll: maintain an O(1) backlog counter, or sample the drain curve at fixed times instead of polling to 0) to finally show `smart`'s "best of both" on the freshness axis.
7. **Real hardware / lighter throttle** (4–8×) to separate the genuine signal from throttle wall-clock inflation, and to test the "fast machine → bigger renderQueue win" caveat.
8. **Web Worker / OffscreenCanvas** offload of the producer or the diff — never attempted; would move the write pass off the main thread entirely (big architectural change).
9. **Viewport-scoped subscriptions (IntersectionObserver bind/unbind)** — only visible cells hold effects/subscriptions; offscreen cells' stores have ZERO listeners, so the Round-6 fast-path makes their writes ~free, and on scroll-in the cell rebinds and pulls the current value. This composes the two proven wins (fast-path + cv) into an architecture where ~90% of stores are on the fast-path at any moment — and it is shaped like a real shippable addon (`bindVisible`), not just a lab mode. Probably the highest-leverage untried idea.
10. **Browser-native scheduling: `isInputPending()` + `scheduler.postTask`/`scheduler.yield`** — replace `smart`'s hand-rolled 2ms/10ms input-reserve toggle with `navigator.scheduling.isInputPending()` checked inside the slice loop (abort the slice the instant input queues) and run sweeps as `postTask({priority:'background'})`. This is the native version of what `smart` approximates and could beat it on burst input; also check whether `scheduler.yield()` (continuation-priority) beats rAF chaining for the drain loop.
11. **Canvas paint-floor mode (`mode=canvas`)** — the paint analog of Round 6's `plain`: draw all cells to a single `<canvas>` each frame. Measures the theoretical paint floor, i.e. how much of the cv win is culling vs DOM-being-DOM — and tells us whether an OffscreenCanvas-in-worker pipeline (item 8) still hides a big multiple beyond `smartcv` or whether we are already near the wall.
12. **Tile-level dirty tracking** — group cells into K×K tiles and track dirtiness per tile, not per cell: slices drain whole tiles (less bookkeeping, better paint locality), tiles are a natural unit for recency-priority (item 4), and per-tile `content-visibility` containers may cull better than per-cell.
13. **Throttle-free scaling methodology** — drop the drifting 20× CDP throttle (12–36× drift, wall-clock inflation) and instead run native, scaling `cells` until saturation; report the N at which each mode drops below 30/10 fps. Cleaner cross-mode comparisons, and it directly resolves the Round-2 "fast hardware → bigger win?" caveat without real hardware.
14. **Double-buffered grid swap** — paint the next frame's dirty cells into a hidden (`content-visibility:hidden` or `display:none`) clone and swap once per frame, batching all style/layout invalidation into one pass. Cheap experiment; probably loses to plain cv, but it is the last unexplored paint-batching trick.

## Verdict as it stands

KILL `renderQueue` as designed (freeze + starvation + dominated + over budget). The constructive direction, layered by cost: **(1) reduce render work** — `content-visibility` (only thing that raises the fps ceiling); **(2) drop-stale, cursor-fair, input-reserved pull rendering** — `smart`/`pull`/`bounded`; **(3) the write-pass floor** — *now addressed* by the Round-6 kernel no-subscriber fast-path (`src/core/state.js`), which makes an unsubscribed store's write ~10× cheaper (156→16ms/frame) and lands it within ~1–2× of plain data, so the churny layer no longer needs to abandon `state()`. Layer 3's remaining O(N) is the irreducible `Proxy` trap + DOM paint, not the notify/flush machinery.

**The constructive stack is now empirically complete and ordered (Round 7):** Layer 1 `content-visibility` is load-bearing (only lever that cuts the dominant cost, paint; free CSS), Layer 2 `smart` (input-reserved drop-stale pull) is a secondary multiplier that only surfaces once Layer 1 uncovers it — and can *hurt* at large grids if used alone — and Layer 3 (the write floor) is gone via the Round-6 fast-path. Best configuration measured end-to-end: **`smartcv`** (content-visibility + smart pull over fast-path'd unsubscribed stores), dashboard 3000 median input 515 ms vs `off` 1887 ms, fps 1.0 vs 0.3.

**Highest-leverage next step:** graduate the Round-6 fast-path to `main` (behaviourally transparent — 488 tests green — so an artifact-matrix exercise, not more research). Remaining unstarted research candidates are items 4–14 in the list above; of those, the most promising by expected leverage are **item 9 (viewport-scoped subscriptions — composes the two proven wins into a shippable shape)**, **item 10 (native `isInputPending`/`postTask` scheduling — could beat `smart`'s hand-rolled budget)**, and **item 11 (canvas paint floor — tells us whether a big multiple still exists beyond `smartcv` or we're near the wall)**. A sensible stopping criterion for the research: either find a configuration ≥2× better than `smartcv` on median input, or show empirically (canvas + plain floors both measured) that `smartcv` is within ~2× of the hard floor.
