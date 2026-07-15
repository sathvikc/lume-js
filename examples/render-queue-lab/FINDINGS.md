# renderQueue — research findings and go/no-go verdict

> Research session, 2026-07-14. Branch: research (off latest `main`). The experimental `renderQueue` addon was cherry-picked from the frozen `feature/render-queue` branch (originally `c3864fe`) so it is importable; the silent 8→9 KB budget raise that shipped with it was **reverted** here so the addon's real cost is measured, not hidden. This file is the artifact the maintainer reviews. Testbed: [`examples/render-queue-lab/`](.); drivers: [`run.mjs`](run.mjs), [`sweep.mjs`](sweep.mjs); raw per-case JSON: [`results/`](results/).

## Verdict — KILL the addon as designed (do not ship); keep the *direction* alive

The freeze reproduces immediately and is root-caused: it is a structural mismatch between the drain's per-frame *time* budget and the load's per-frame *count* of re-dirties, with no fix that doesn't reintroduce the input jank the addon exists to prevent. Across realistic regimes renderQueue delivers at most a ~1.5× median input-latency improvement (target: ≥5×), while freezing the presentation under sustained load. A 15-line rAF coalesce matches it without freezing; `content-visibility: auto` — free, zero-JS, standards-only — beats it 2–3×. It is also 0.37 KB over the all-in-one bundle budget. Four of five SHIP criteria fail.

**Round 2 (after maintainer pushback) reinforced the KILL for the shipped addon but showed the research direction is not dead — see [Round 2](#round-2-reconciliation-a-real-bug-and-two-better-designs) below.** Headline additions: (1) renderQueue has an **active starvation bug** — under a uniform re-dirty order (any grid iterating cells in order) it repaints ~8 cells up to 13× each while **2984 of 3000 never paint at all**; the "re-dirty moves to back" guarantee fails for uniform order and the tests never exercise it. (2) The maintainer's **round-robin-cursor instinct is correct** — a `bounded` variant paints every cell fairly and bounds staleness. (3) A new **`pull`-based** design (no per-cell effects at all) attacks the effect-flush floor renderQueue leaves untouched and wins the storm regime. The specific renderQueue design should be retired; `content-visibility` (sparse updates) and pull-based budgeted rendering (dense updates) are the directions worth pursuing.

## The three numbers that decide it

1. **~1.5× — the best it does.** renderQueue's largest median input-latency improvement over the `batch()`+effects baseline in *any* clean regime (storm 1964 ms vs 3050 ms). The SHIP bar was ≥5×. In the realistic dashboard regime it is 1.18× (1500 vs 1777 ms).
2. **897 vs 1500 ms — a CSS one-liner wins.** `content-visibility: auto` in the dashboard regime: 897 ms median input, pixels current, 0 KB. renderQueue: 1500 ms, an 800-entry backlog, +0.9 KB. cv beats it 2–3× in every realistic regime.
3. **∞ / 23 s — the freeze.** Under sustained load renderQueue's pixel staleness grows without bound (measured to 19.6 s and still climbing at 21 s); after a one-shot burst it takes 23 s to converge, vs 2.8 s for the baseline and 0.4 s for cv.

---

## What renderQueue is, in one paragraph

`renderQueue` keeps state synchronous but makes the DOM writes that *present* state schedulable: each binding splits into a `track()` half (a tracked read that runs inside Lume's flush under a real `effect()` and only marks the entry dirty) and an `apply()` half (the DOM write, drained later on `requestAnimationFrame` within a `budgetMs` slice, priority-ordered high → visible → offscreen → idle, preempted by `navigator.scheduling.isInputPending()`). Coalescing is structural (dirty entries in a `Set`). The pitch: at thousands of cells per frame the browser runs one atomic long task and every keystroke queues behind it; spreading the DOM writes across budgeted frames should keep input responsive while the backlog drains. `queue.size` is the honest backlog. The load-bearing assumption is that **the DOM `apply()` work is the dominant per-frame cost** — so deferring it frees the main thread for input.

## Methodology

### Environment and throttle

- Headless Chromium (`/opt/pw-browsers/chromium`) driven by `playwright-core` 1.49. CPU throttled via CDP `Emulation.setCPUThrottlingRate { rate: 20 }`.
- **Throttle verified every run** with a 2M-iteration `i % 7` busy-loop probe, JIT-warmed first (5 discarded runs). Warm native ≈ 7.1 ms; throttled ≈ 135 ms → **19.0× effective slowdown**, re-probed after each run to confirm it held. Every result JSON carries its own `throttle` block. The absolute throttled time is higher than a fast dev laptop's (native here is ~7 ms, not ~1.3 ms), but the *ratio* is the regime the prototype targeted.
- rAF runs while the page is visible (`document.visibilityState === 'visible'`); a rAF counter confirmed ~60 fps for a trivial callback under throttle, so the drain is not being starved by a paused rAF loop. The occluded-tab hypothesis for the freeze is therefore ruled out for the visible-page measurements — and a page whose rAF is paused (backgrounded) simply stops draining *and* stops writing, so it is not a live-load freeze.

### Input latency metric (and why not Event Timing alone)

Input delay is measured **in the page** as `performance.now()` at the `keydown`/`pointerdown` handler minus the event's own `timeStamp` — both in the page clock, so it is the true queueing delay before the handler ran, independent of paint. Keys are injected at a fixed 100 ms cadence via CDP `Input.dispatchKeyEvent`, **fire-and-forget** (never awaiting the renderer): `page.keyboard.type` deadlocks the driver when a frame is seconds long, because Playwright awaits each keystroke's renderer round-trip. The Event Timing API (`PerformanceObserver('event', { durationThreshold: 16 })`, `processingStart - startTime`) is recorded too as a cross-check, but it *under-reports badly* under this load — its `duration` is paint-coupled and the observer callback lags behind multi-second frames, so it returned zero entries in the frozen cases while 50 real keystrokes were captured by the direct measure. The driver reports the direct measure; the tables below are worst and p95 of it.

### Modes (identical `apply()` work; only *when* it runs differs)

| mode | what it does |
|---|---|
| `off` | current library baseline — one `effect()` per cell, DOM write **synchronous in the flush** (`batch()` + plain effects) |
| `rq` | the real `renderQueue` addon (tiers, budget, IntersectionObserver, input-preempt) |
| `simple` | ~15-line rAF-coalesced apply: a write marks the cell dirty in a `Set`, **one** rAF applies **every** dirty cell — no tiers, no budget, no IO, no preempt |
| `adaptive` | synchronous applies while frames are cheap; engages the `simple` deferred drain only after a frame busts a jank threshold (hysteresis 32 ms / 20 ms) |
| `cv` | `off` + CSS `content-visibility: auto` on cells (re-verify the 2026-07-11 "measured worse" note) |

### Regimes (how state is written each frame)

- **storm** — 100% of cells re-dirtied every frame (the pathological ceiling, not the typical case).
- **dashboard** — a random 5–8% of cells change per frame (the realistic steady regime).
- **burst** — all cells change once, then quiet (measures the one-shot spike and convergence).
- **quiet** — no writes at all (isolates the per-frame overhead of the mode/testbed itself).

Typing (input) is driven by the external driver while every regime runs. **Scrolling-under-load was not separately driven** — an honest scope note. The `visible`-auto tier (IntersectionObserver) is nonetheless exercised in every case, and scrolling only *reprioritizes* the drain; it cannot lift the drain-throughput ceiling that causes the freeze, so newly-scrolled-in cells still wait behind the backlog. The dimension scrolling stresses — rendering cost of on/off-screen cells — is exactly what `content-visibility: auto` (already the measured winner) culls on demand as you scroll, so a scroll regime would widen cv's lead, not renderQueue's. It does not change the verdict.

### The dot-animation artifact (methodology correction mid-session)

The first full sweep ran with a small rAF-driven "jank dot" (a moving `transform`, as in the original `priority-proto`). A quiet-mode control (zero state writes) exposed it as a large confound: at 3000 cells the moving dot alone drove the page to ~4.7 fps, and the cost scaled with DOM size (its layer is not promoted in this headless build, so the animation forces per-frame repaints of the region it crosses).

| quiet fps (no writes) | 200 cells | 800 | 1500 | 3000 |
|---|---|---|---|---|
| dot **on** | 45.7 | 17.2 | 10.0 | 4.7 |
| dot **off** | 51.9 | 50.4 | 44.4 | 24.7 |

With the dot **off**, the floor at 3000 cells is ~25 fps — still non-trivial (the browser styles/composites 3000 live nodes each frame, which **renderQueue cannot reduce**), but low enough that the scheduling signal is visible with many frames and many keystrokes per window. **All headline numbers below use `dot=0`.** This also gives renderQueue its *best* case: with no forced full-frame repaint, deferring `apply()` has the maximum possible room to help. The dot-on sweep is retained in `results/summary-full.json` as a cross-check and is where the freeze was first characterized.

---

## The freeze: reproduced and root-caused

**It reproduces immediately and deterministically** — it is not a rare glitch. Under any sustained-load regime at scale, the renderQueue path drives the *presentation* into a permanent, ever-worsening lag while state stays correct. A live trace of `rq` + storm at 3000 cells / 20× (dot on, second-by-second):

```
t=1.2s  backlog=3000  applied+=3000  rafFrames/s=2  maxStale=0ms      ← initial first-paint of all cells
t=2.3s  backlog=3000  applied+=8     rafFrames/s=1  maxStale=1201ms
t=4.4s  backlog=3000  applied+=24    rafFrames/s=2  maxStale=3425ms
t=6.1s  backlog=3000  applied+=376   rafFrames/s=2  maxStale=5288ms
t=8.0s  backlog=3000  applied+=16    rafFrames/s=2  maxStale=5288ms
 ...    backlog=3000  applied+=~16   rafFrames/s=~2 maxStale climbing
t=23.5s backlog=3000  applied+=24    rafFrames/s=2  maxStale=13836ms   ← 13.8s stale and still rising
```

**What froze:** the *pixels*, not the input and not the main thread. State, `$subscribe`, `batch()` all stay live and correct. But the DOM presentation is pinned 3000 entries behind and the staleness of the oldest unpainted cell grows without bound (13.8 s and rising at t=23 s). Only ~8–24 cells repaint per second out of 3000, so a given cell repaints roughly once every ~3 **minutes**. The main thread is *not* deadlocked (rAF keeps firing ~1–2/s), and there is no microtask storm or infinite loop — the flush-loop cap (100) is never hit. It is a throughput collapse, not a hang.

**Root cause — the drain cannot keep up with the re-dirty rate, by construction:**

1. Each frame the storm re-dirties **all 3000** entries (their `track()` effects re-run in Lume's synchronous flush).
2. The drain is bounded to `budgetMs` (2 ms) of `apply()` per frame, checked every 8 entries via `(n & 7)`. Under 20× throttle, 2 ms clears only **~16 cells per frame**.
3. Frames are ~0.5–1 s under load (the synchronous flush of thousands of effects — which renderQueue does **not** shrink — dominates the frame), so the drain runs only ~1–2×/s.

Inflow ≈ 3000 cells/frame; drain ≈ 16 cells/frame. The backlog is a bucket with a 3000-wide inflow and a 16-wide outlet: it pins at the cell count and the staleness of the oldest entry grows monotonically for as long as the load runs. It converges only *after* writes stop.

**Why the alternatives designed to prevent this don't:** the `Set`-keyed re-dirty-moves-to-back rule guarantees FIFO *within a tier* (no single entry starves relative to its siblings), and the tests prove it — but it does nothing about the aggregate: every entry is equally, perpetually behind. `budgetMs` is the knob that would help, but raising it trades the freeze back for the input jank it exists to prevent, and the sweep shows even `budgetMs: 32` does not converge the dashboard regime (see below). This is a structural mismatch between the addon's throttle (a per-frame *time* budget) and the load (a per-frame *count* of re-dirties), not a tuning miss or a bug to patch.

**Scale confirms it** (rq storm, dot on): 1000 cells → 1.6 fps, backlog pins at 1000, staleness 2.3 s; 3000 → 0.3 fps, pins at 3000; 10000 → 0 fps (frame > 29 s), pins at 10000. The freeze is monotonic in cell count.

**The 15-line `simple` alternative does NOT freeze** — a side-by-side staleness trajectory (storm, 3000, dot off) makes the structural difference explicit:

```
rq/storm      3s→1292ms  7s→1326ms  10s→8806ms  13s→11110ms  18s→15905ms  21s→19596ms   ← unbounded, still climbing
simple/storm  4s→1395ms  7s→2688ms  11s→3002ms  13s→3492ms   20s→3492ms   30s→3492ms    ← plateaus at ~1-2 frames
```

`simple` applies *every* dirty cell each frame, so its staleness is bounded to ~1–2 frames no matter how long the storm runs; renderQueue's `budgetMs` cap is exactly what makes its staleness unbounded. The sophisticated addon has the failure mode the naive version does not.

**Why the test suite and the prototype both missed it:** the 20-case suite mocks `requestAnimationFrame`, `IntersectionObserver`, and scripts `performance.now`, so it verifies the *logic* (coalescing, tier order, budget-stop, preemption, no intra-tier starvation) but by construction cannot model the real timing dynamic where re-dirty rate outruns drain throughput. The prototype's good numbers were taken at a lighter apply cost where the flush was a small fraction of the frame; the freeze appears once the synchronous flush (which renderQueue leaves untouched) becomes the frame's floor.

---

## Regime results (clean: `dot=0`, 3000 cells, 20×, real keystrokes at 10/s)

All numbers are the **median** across the measurement window unless noted (worst/p95 are in the raw JSON). Median is the honest per-frame/per-keystroke figure; worst is a single outlier and, at 3–8 frames per window under this load, too noisy to lead with. Input delay = queueing delay before the keydown handler ran (ms). Full distributions: `results/*-nodot-type.json`.

### Storm — 100% re-dirty every frame (pathological ceiling)

| mode | input (median) | input (p95) | frame gap (median) | peak backlog | pixels |
|---|---|---|---|---|---|
| off | 3050 | 4932 | 5266 | 0 | current every frame |
| **rq** | **1964** | 3650 | 2517 | **3000** | **frozen — 3000 behind, staleness unbounded** |
| simple | 2962 | 4777 | 5117 | 3000 | ~1 frame behind (drains fully each frame) |
| cv | 2806 | 3901 | 4050 | 0 | current every frame |
| adaptive | 3129 | 5103 | 5250 | 3000 | frozen |

rq's best case. It cuts median input 1.55× vs OFF (1964 vs 3050) and here it *does* beat `simple` (1964 vs 2962) — the budget genuinely spreads work where `simple` applies all 3000 each frame. But 1964 ms is still "hung," and the price is a permanently frozen presentation (backlog pinned at 3000, staleness climbing without bound — see the trace above). Storm is a loss on the axis renderQueue exists to protect: the pixels.

### Dashboard — 8% change per frame (the realistic steady regime)

| mode | input (median) | input (p95) | frame gap (median) | peak backlog | pixels |
|---|---|---|---|---|---|
| off | 1777 | 3039 | 3317 | 0 | current |
| **rq** | **1500** | 3122 | 2983 | 803 | lagging, backlog accumulates |
| simple | 1883 | 3074 | 3433 | 233 | lagging |
| **cv** | **897** | 1494 | 1917 | 0 | current |
| adaptive | 1618 | 3027 | 3133 | 235 | lagging |

The regime that decides it. rq improves median input over OFF by only **1.18×** (1500 vs 1777) — and **content-visibility, a zero-JS CSS one-liner, is 2× better than OFF and 1.7× better than rq (897)** while keeping pixels current and adding nothing to the bundle. rq accumulates an 800-entry backlog for a sub-1.2× input gain. There is no realistic-regime win here to justify the addon.

### Burst — all change once, then quiet (the one-shot spike + convergence)

| mode | input (median) | frame gap (median) | peak backlog | **convergence after load stops** | pixels |
|---|---|---|---|---|---|
| off | 1476 | 2467 | 0 | **2.8 s** | current |
| **rq** | **1211** | 3000 | 3000 | **23.2 s** | 3000 behind for 23 s |
| simple | 1311 | 2500 | 3000 | 1.8 s | ~1 frame behind |
| **cv** | **482** | 1117 | 0 | **0.4 s** | current |

The regime renderQueue should own — a bounded spike is exactly what a budget is for. Yet the clean median-input gain over OFF is **1.22×** (1211 vs 1476), and it costs a **23-second** stale-pixel tail: after the burst, rq drains ~16 cells/frame and takes 23 s to show the data OFF showed in 2.8 s and cv in 0.4 s. cv is 3× better on input *and* converges 58× faster. (The dot-**on** sweep flattered rq here — 2437 vs OFF 4723 — because the dot's forced repaint dominated OFF's single spike frame; removing that artifact erased the apparent win.)

### Scale (dashboard, dot off)

| cells | off | rq | simple | rq vs off | rq backlog |
|---|---|---|---|---|---|
| 800 | 368 | 309 | 263 | 1.19× | 310 |
| 1500 | 978 | 628 | 621 | 1.56× | 721 |
| 3000 | 1777 | 1500 | 1883 | 1.18× | 803 |

rq's edge peaks around 1.5× and never grows toward 5×; `simple` matches it at 800–1500 cells. The backlog (frozen pixels) appears at every scale.

## Mechanism — why renderQueue can't move the needle

renderQueue's load-bearing assumption is that **`apply()` (the DOM write) is the dominant per-frame cost**, so deferring it frees the thread. The data falsifies that assumption for Lume at scale:

1. **The applies aren't the bottleneck.** In dashboard, rq applied ~16 cells/frame while OFF applied ~240 — yet their frame gaps were within noise of each other. Deferring nearly all the applies did not shrink the frame.
2. **What the frame actually costs** (mechanism probe, `render=1` vs `render=0` — identical effect flush, DOM writes on vs off, dashboard, no typing): median frame **167 ms → 67 ms**. So ~60% of the frame is the browser's rendering lifecycle (style/layout/paint), ~40% is the synchronous effect flush. renderQueue **reduces neither**: the flush (every dirtied cell's `track()` effect) runs in full every frame regardless — renderQueue explicitly keeps it synchronous — and the rendering lifecycle is triggered on *every* frame the drain touches the DOM, which under load is every frame. Spreading the writes means paying the (largely fixed, O(DOM)) rendering lifecycle on *more* frames, not fewer.
3. **The thing that works attacks the actual cost.** `content-visibility: auto` shrinks the rendering lifecycle itself by skipping offscreen cells — so it wins in exactly the regimes renderQueue targets, for zero JavaScript and zero bytes.

renderQueue optimizes the layer that isn't the bottleneck.

## Alternatives, head to head

- **(a) baseline `off` (`batch()` + effects).** The bar. renderQueue beats it by at most ~1.5× (median input) and only under load heavy enough to also freeze renderQueue's own pixels.
- **(b) `simple` — 15-line rAF coalesce, no tiers/budget/IO.** Captures renderQueue's storm behavior *without* the budget's benefit (it applies everything each frame, so under storm it ≈ OFF) — but also without renderQueue's worst failure: because it drains fully each frame, its staleness stays ~1 frame, not unbounded. In dashboard/burst it's within noise of renderQueue. Net: `simple` gets most of what renderQueue gets, in 15 lines and 0 KB, and does not freeze. Where renderQueue beats `simple` (storm input, 1964 vs 2962) the win is a still-hung page with frozen pixels — not worth shipping.
- **(c) `adaptive` — engage deferral only after a janky frame.** No better than OFF in any regime (hysteresis flip-flops under sustained load); adds complexity for nothing.
- **(d) `content-visibility: auto`.** Re-verified, and the 2026-07-11 "measured worse" note only holds for the *storm* ceiling (cv 2806 vs rq 1964 — worse, because offscreen cells that scroll in must render). In the **realistic** dashboard and burst regimes cv is the **best** option measured — 897 and 482 ms median input, 2–3× better than everything else, pixels current, converges in 0.4 s — and it is pure standards-only CSS, no addon, no bytes. This is the recommendation the research surfaces for the underlying user problem.

## Success criteria for SHIP — scorecard

| # | Criterion | Result |
|---|---|---|
| 1 | Freeze reproduced and root-caused, with a fix or shown unrelated | **Met** (reproduced, root-caused as a structural drain-throughput vs re-dirty-rate mismatch) — but the root cause has **no fix** that doesn't reintroduce the input jank; it is not "unrelated." |
| 2 | ≥5× worst-input improvement in a realistic regime, and no regime meaningfully worse than OFF | **FAIL.** Best is ~1.5× (median) / ~1.4× (worst). And every sustained/burst regime is meaningfully worse than OFF on the presentation axis (frozen/lagging pixels; 23 s burst convergence). |
| 3 | The simple rAF-coalesce does NOT capture most of the win | **FAIL in spirit.** `simple` matches rq in the realistic regimes and doesn't freeze; rq only out-performs it under storm, where both are hung. There is no shippable win for the machinery to justify. |
| 4 | Backlog converges after load stops in every regime; no starvation; bounded, displayed staleness | **FAIL.** Converges only trivially for OFF/simple/cv; rq's burst convergence is 23 s and its sustained-load staleness is unbounded. (Intra-tier starvation-freedom does hold.) |
| 5 | Bundle fits existing budgets, or a standalone ratifiable case to raise them | **FAIL.** With the budget kept at 8 KB, `lume.global.js` is **8.37 KB gz — 0.37 KB over**. See below. |

Five criteria; one met, four failed. **KILL.**

## The size-budget question, resolved

The addon shipped with a silent edit raising `lume.global.js` from 8 KB to 9 KB in `scripts/check-size.js`. Reverted here. Measured with the budget at its real 8 KB:

| bundle | with renderQueue | budget | verdict |
|---|---|---|---|
| `state.min.mjs` (kernel) | 1.46 KB | 1.75 KB | ok (untouched) |
| `addons.min.mjs` (npm addons) | 5.62 KB | 6 KB | ok |
| `lume.global.js` (CDN all-in-one) | **8.37 KB** | 8 KB | **over by 0.37 KB** |

There is no standalone case to raise the global budget for this feature, because there is no feature: a KILL verdict means the 0.37 KB buys nothing. The budget stays at 8 KB. (Had the verdict gone the other way, the honest path was a *ratified* decision entry arguing the all-in-one bundle's budget, not a one-line edit buried in a feature commit — CLAUDE.md's "raising a budget usually means the change is designed wrong" is precisely the signal that fired here.)

## Verdict: KILL

Do not ship renderQueue, not even as experimental. The scheduling model is sound and the code is careful, but it optimizes the wrong layer: under real timing at scale the per-frame cost is the synchronous effect flush plus the browser's rendering lifecycle, and renderQueue reduces neither — it only reschedules the DOM writes, which are a minority of the frame. The result is at most a ~1.5× median-input improvement, never the ≥5× bar, bought with a presentation that freezes under sustained load (backlog pinned, staleness unbounded) and takes 23 s to converge after a burst. A 15-line rAF coalesce matches it in realistic regimes without freezing; `content-visibility: auto` — free, zero-JS, standards-only, maximally on-brand — beats it 2–3× in exactly the regimes it targets. And it doesn't fit the bundle budget. Every SHIP criterion but one fails.

**Recommendation for the underlying problem** (input stays responsive while thousands of cells update): point users at `content-visibility: auto` + `contain-intrinsic-size` in a performance guide — it is the standards-only answer and it measured best here — and keep investing in the two wins that already shipped (effect subscription reuse, `repeat()` LIS reconcile), which reduce the flush and DOM-move costs that actually dominate the frame.

## Proposed `design-decisions.md` entry (ratifiable, house style)

> ### renderQueue (priority-scheduled presentation) — researched and rejected
>
> **Decision:** Do not ship a presentation scheduler that defers DOM writes off Lume's synchronous flush (the `renderQueue` prototype on `feature/render-queue`: a `track`/`apply` split drained on rAF within a `budgetMs`, priority-tiered, input-preempted). State stays synchronous — that part is right and unchanged — but presentation stays synchronous too. For the "thousands of cells, stay responsive at 20× CPU throttle" problem, recommend `content-visibility: auto` (standards-only CSS, zero bytes) and continue reducing flush/DOM-move cost in the core.
>
> **Reasoning:** Measured across realistic regimes (dashboard 5–8% churn, one-shot burst) at 3000 cells / 20× with real keystrokes ([`examples/render-queue-lab/`](../../examples/render-queue-lab/FINDINGS.md)), the addon delivered at most a ~1.5× median input-latency improvement over the `batch()` + effects baseline — the target was ≥5×. The premise that DOM `apply()` dominates the frame is false at scale: a flush-vs-render probe put ~60% of the frame in the browser's rendering lifecycle and ~40% in the synchronous effect flush, and renderQueue reduces neither (it keeps the flush synchronous by design and triggers the rendering lifecycle on every frame it drains into). Worse, deferring the drain freezes the presentation under sustained load — the drain clears ~16 cells/frame under throttle while the load re-dirties thousands, so the backlog pins at the cell count and staleness grows without bound; a burst took 23 s to converge versus 2.8 s for the baseline. `content-visibility: auto` beat it 2–3× in the same regimes because it shrinks the rendering lifecycle itself, which is the actual bottleneck.
>
> **Alternatives considered:** (1) A 15-line rAF-coalesced apply with no tiers/budget/IO — matches renderQueue in realistic regimes, in 0 KB, and does not freeze (it drains fully each frame, bounding staleness to ~1 frame); it only underperforms renderQueue under a 100%-re-dirty storm, where both leave the page hung. (2) Adaptive engagement (defer only after a janky frame) — no better than baseline in any regime. (3) `content-visibility: auto` — the winner, and already standards-only. Shipping renderQueue would add ~0.9 KB (pushing the all-in-one bundle 0.37 KB over its 8 KB budget), a fourth reactive-primitive concept, and an honest-but-alarming "N cells behind" backlog users must design around — to underperform a CSS property.
>
> **Tradeoff:** We give up a genuinely clever mechanism (the `track`/`apply` split is elegant and the coalescing is free) and the ability to say Lume "schedules pixels." In exchange the core stays at three reactive primitives, the all-in-one bundle stays under 8 KB, and we don't ship a feature whose own headline metric (the backlog) advertises that it freezes the UI under the exact load it was built for. The kill is reversible: if a future version can defer or shrink the *effect flush* (not just the DOM write) and cap staleness, the track/apply split is worth revisiting — that, not apply-scheduling, is where the frame's time actually goes.

## Round 2: reconciliation, a real bug, and two better designs

Prompted by four maintainer questions — does combining `batch()` with renderQueue help; why did the original `priority-proto` show good numbers when I measured ~1.5×; would a frame-coalescing / round-robin scheme help; and can the research *invent* something rather than only test what exists. All four turned out to be productive. Data: `results/round2-summary.json`; driver: `round2.mjs`.

### `batch()` + renderQueue — already the baseline, and they attack different costs

Every regime here already wraps writes in `batch()`, so "off" is `batch()`+effects and "rq" is `batch()`+renderQueue — the combination *is* what was measured. They are orthogonal: `batch()` collapses the **effect flush** (an effect reading N changed stores re-runs once, not N times), renderQueue defers the **DOM apply**. `batch()`'s dramatic win in the `examples/batch/` demo comes from an *aggregate* effect reading many stores; this lab uses one store per cell, so `batch()`'s dedup barely applies and the win there is small. Stacking renderQueue on top adds the ~1.5× above. The lever `batch()` can't reach in the per-cell case — the O(N) flush of one effect per changed cell — is exactly what the `pull` design below targets.

### Why `priority-proto` looked better: the fixed-floor ratio (and a hardware caveat)

renderQueue's input win is roughly `OFF-frame ÷ (fixed-floor + budget)`, where the fixed floor is the part of the frame it *can't* spread — the synchronous effect flush plus the browser's rendering lifecycle. When the floor is small relative to the spreadable apply cost, spreading wins big; when the floor dominates, spreading barely helps. Two things determine the floor here:

- **Hardware.** The prototype's machine was ~5× faster natively than this environment (its busy-loop probe was ~1.3 ms vs ~7 ms here). On a fast machine a 3000-cell frame is small enough that the apply is spreadable and you can see ~7×; here the same frame is multiple seconds and the floor swamps the win. This is a real caveat: **on production-class hardware renderQueue's input benefit may be larger than the ~1.5× measured here.** It does not change the freeze (below), which is arithmetic.
- **Render path, not headless.** I checked whether headless software rasterization was inflating the floor by re-running headed (real compositor, under `xvfb`). It was not: the ~3200 ms frame floor persisted in both paths (headed rq/off ratio 1.06× — no win), so the weak benefit is not a headless artifact. (Single-case fidelity runs were noisy — the CDP throttle drifted 24–36× between cases — which is itself why the multi-case sweep medians, not single A/Bs, are the numbers to trust.)

### The starvation bug (new, concrete, environment-independent)

Tracing the drain under a **uniform** re-dirty order — the storm writes cells 0…N in order every frame, exactly what a list or grid iterating its items produces — exposes a real defect. Each frame every entry's `track()` effect re-runs and does `dirty.delete(rec); dirty.add(rec)`, re-adding all entries in the *same* order; the drain then always takes the front 8–16 and deletes them, and next frame they are re-added at the back while the middle re-adds in place — so the front is perpetually the same low-index cells. Measured over a 10 s storm (`round2.mjs starve`):

| mode | cells painted / 3000 | applies per cell (min–max) |
|---|---|---|
| **rq** | **16** | **0–13** (8 cells repainted 13×, 2984 never) |
| simple | 3000 | 5–5 (perfectly fair — full drain each frame) |
| bounded (cursor) | 2416 | 0–1 (fair sweep; the rest simply not-yet-reached) |

renderQueue's own "no starvation" test passes because it only re-dirties a *single* entry; it never exercises the uniform-order case, so the bug ships green. This makes the shipped addon worse than "modest benefit + freeze": under the most natural update pattern it paints < 1% of the grid and calls the staleness on the other 99% "backlog."

### `bounded` — the maintainer's round-robin cursor (fixes the freeze)

The fix the maintainer intuited: don't always drain from the front — advance a **cursor** through a flat entries array, so every cell is visited within `ceil(N / throughput)` frames. Staleness becomes bounded by one sweep instead of infinite, and no cell starves (max 1 paint per sweep vs renderQueue's 13). It keeps renderQueue's budgeted-frame benefit for input. In the sparse dashboard regime it was in fact the **best non-CSS option** (median input 845 ms vs OFF 1382 ms, 1.6×). This is a genuine improvement over the shipped design and validates the instinct — but it is a fix to a scheduler that still, at best, ties the free CSS option.

### `pull` — invent something new: no per-cell effects at all (attacks the flush floor)

Every push-based scheduler above (off/rq/simple/bounded) still re-runs one effect per changed cell every frame — the synchronous flush that the mechanism probe put at ~40% of the frame and that renderQueue explicitly keeps synchronous. So the new idea inverts it: **no effects.** One rAF loop sweeps cells from a cursor, reads current state, and paints those whose value changed since last paint, within budget — pull-based, zero flush. Trades fine-grained reactivity (it polls) for eliminating the O(N) flush.

Result: `pull` had the **best input and the shortest frame in the storm regime** (median input 1263 ms, frame 2183 ms — better than every push design) because it pays no flush. Its expected weakness also showed: in the sparse dashboard regime (only 8% change) it wastes a full 3000-cell read-sweep to find the few that changed, so it fell behind `bounded` (1193 vs 845 ms). Clean, characterizable tradeoff: **pull is the right tool for dense/always-changing grids; content-visibility for sparse.** It is a genuinely different primitive from renderQueue and the most promising thing this research produced.

### Full round-2 comparison (dot off, 3000, 20×, median input ms)

| mode | storm input | dashboard input | fairness | staleness | notes |
|---|---|---|---|---|---|
| off | 2095 | 1382 | fair (sync) | tiny | honest baseline; input worst |
| rq | 1283 | 1359 | **starves (8 cells 13×, rest 0)** | unbounded | dominated + broken |
| simple | 1457 | 1296 | fair | ~1–2 frames | 15 lines, no freeze |
| **bounded** | 1406 | **845** | fair (cursor) | bounded | maintainer's fix; best non-CSS in dashboard |
| **pull** | **1263** | 1193 | fair | bounded | new; best in storm; polling-wasteful when sparse |
| **cv** | 1360 | **457** | fair | tiny | free CSS; best in dashboard |

### Revised recommendation

- **renderQueue as designed: KILL, reinforced.** It is dominated in input by `pull`, `bounded`, and `cv` in the regimes each targets, and it actively starves the grid under the most common update order. Do not ship it.
- **The direction is not dead, and the maintainer's instincts were right.** The round-robin cursor fixes the freeze; pull-based rendering attacks the real bottleneck. If Lume wants to pursue schedulable presentation, retire the tiered-push-queue design and prototype a **pull-based budgeted renderer** (no per-cell effects, cursor-fair, staleness bounded by construction) as a real addon, then re-measure on production hardware where the fixed floor is small. Ship `content-visibility` guidance now regardless — it is free and wins the common case.
- **The design-decisions entry above stands** (reject the shipped `renderQueue`), with the round-2 findings — the starvation bug and the pull/bounded alternatives — added to its "Alternatives considered" and "Tradeoff" as the concrete reasons the door is left open for a different, pull-based mechanism later.

## Round 3: the fps ceiling and keeping the main thread free

Two maintainer questions: (1) how many frames/second can we actually update, and below what point (60 / 120 fps) is a technique warranted; (2) how do we keep the main thread free so the user can do other things (the smoothness that input responsiveness is really about). Instrumented with the Long Tasks API — `worstBlock` = the single longest task (the worst input-blocking hang), `thread-free %` = share of the window not locked in > 50 ms tasks. Data: `results/headroom-summary.json`; driver: `headroom.mjs`. (Headless rAF is vsync-capped at 60 fps, so a measured 60 means "the frame's work fits the 16.6 ms budget"; below 60 means it does not.)

### The 60 fps capacity — how many cells before you drop below the line (native, 1×)

fps at increasing cell counts, storm (100% change) and dashboard (8% change):

| | 1000 | 2000 | 4000 | 8000 |
|---|---|---|---|---|
| **storm** off | 34 | 13 | 4 | 1.4 |
| storm pull | 36 | 16 | 6 | 2 |
| storm bounded | 34 | 15 | 6 | 1.9 |
| storm **cv** | **41** | **20** | **9** | **4.6** |
| **dashboard** off | 58 | 20 | 6 | 2 |
| dashboard pull | 58 | 20 | 6 | 2 |
| dashboard bounded | 58 | 20 | 6 | 2 |
| dashboard **cv** | **60** | **58** | **27** | **11** |

The load already blows the 16.6 ms budget at low cell counts: a full storm holds 60 fps for only a few hundred cells; a dashboard for ~1200. Under 20× throttle divide by ~20 (storm is ~3 fps at 500 cells). So yes — beyond a few hundred to ~1000 changing cells you are below 60 fps and something has to give.

**But the crucial split is *which* technique raises the ceiling and which does not:**

- **Rescheduling the work does NOT raise the fps ceiling.** `pull`, `bounded` (and `renderQueue`) run the *same* total work, just spread across frames — so in dashboard they track OFF almost exactly (58/20/6 fps) and in storm they gain only ~15% (from removing the flush). They cannot make work that doesn't fit the frame suddenly fit.
- **Reducing the work DOES raise it.** `content-visibility: auto` renders only on-screen cells, so it holds 60 fps to ~2000 dashboard cells (vs ~1200) and stays 2–4× ahead everywhere — because it does *less*, not because it schedules better. This is the only lever here that moves the fps line, and it is free CSS.

So: **to update *more* at 60 fps, cut the work (content-visibility, plus the already-shipped effect-reuse and `repeat()` LIS that cut flush and DOM-move cost). Scheduling addons do not extend the 60 fps ceiling.**

### Keeping the main thread free — the other axis, where scheduling *does* pay

fps is not the whole story: a page can be at 15 fps and still feel responsive if no single task is long. The metric for "can the user do other things" is `worstBlock` — the longest uninterrupted task — because input can only be handled between tasks.

- **At light load the thread is already free.** At ≤ 1000 cells (native) every mode has `worstBlock = 0` (no task > 50 ms) and 100% free — no technique needed. Techniques earn their keep only once the frame's work exceeds ~50 ms.
- **Once it doesn't fit, budgeting halves the worst block.** Native storm at 2000 cells: OFF's worst task is 129 ms; `pull` 70 ms, `bounded` 74 ms — roughly halved, because they cap per-frame apply work and yield. Under 20× the same pattern holds (storm 500 cells: OFF 408 ms → pull 197 ms). Lower worst-block = the thread comes up for air more often = input handled sooner, even though fps is unchanged. **This — not fps — is what the scheduling designs actually buy.**
- **What none of them free is the writer.** The storm still writes every store synchronously each frame; that write pass (and, for the push designs, the effect flush) is one un-budgeted task that no *presentation* scheduler chunks. It is why even `pull` can't hold 60 fps under a large storm. Fully freeing the thread under heavy writes needs the *writes* time-sliced too — an upstream change that trades away "state is synchronous truth," which is a much bigger decision than a render addon.

### The two principles this settles

1. **Raising the fps ceiling is a work-*reduction* problem, not a scheduling problem.** Cull what you render (`content-visibility`), shrink the flush (effect-reuse — shipped), shrink DOM moves (`repeat()` LIS — shipped). renderQueue/pull/bounded do not help here.
2. **Keeping the thread free when the work genuinely doesn't fit is a work-*chunking* problem** — cap the longest task. Budgeted rescheduling (pull/bounded) halves the worst block; but it only chunks the render, so under heavy synchronous writes the writer/flush still block, and the honest ceiling on this axis is set by whatever you leave un-chunked.

Neither principle rescues the shipped `renderQueue`: it doesn't reduce work (ceiling unchanged) and its worst-block reduction is undercut by the flush it keeps synchronous and the starvation bug. If Lume pursues this, the shape is: **content-visibility guidance for the ceiling + a pull-based, cursor-fair, budgeted renderer for the worst-block** — and measure both axes (fps *and* worstBlock), because they are different problems with different fixes.

## Round 4: the responsiveness-first scheduler (drop-stale + input-reserved budget)

The maintainer proposed a two-principle design and asked to build and measure it, not just reason about it. Built as the `smart` mode (`main.js`), measured by `smart.mjs`; data in `results/smart-summary.json`.

- **Principle 1 — drop stale work, render the latest state, never a growing backlog.** This is exactly what `pull` already does at the per-cell level: it reads *current* state and paints the latest value, coalesced by construction (a cell written 1000× between frames paints once, at the newest value), cursor-fair so nothing starves. There is no queue of superseded change-events to replay. Validated: `pull`/`smart` staleness is bounded, versus `renderQueue`'s unbounded backlog and its starvation bug. **This is the correct fix for the freeze** — and it is the maintainer's principle, independently arrived at.

- **Principle 2 — reserve rendering capacity for user interaction.** New and worth building: while the user is interacting (any input within 250 ms) `smart` shrinks its per-frame render budget so most of the frame is left for input; when idle it grows the budget 5× to catch the picture up. This is better-targeted than the earlier `adaptive` mode (which reacted to janky frames, not to the user).

**Result (burst regime, 3000 cells, 20×, bursty typing — chosen to isolate the render from a continuous writer):**

| variant | median input | busyFrac |
|---|---|---|
| pull, fixed budget 2 ms | 1557 ms | — |
| pull, fixed budget 10 ms | 1486 ms | — |
| **smart (2 ms interacting / 10 ms idle)** | **1218 ms** | 0.7 |

`smart` had the **best input latency of the three** (~1.2× better than either fixed budget), and the dynamic budget verifiably engaged (it saw "interacting" on 70% of render frames under bursty input). So principle 2 works directionally — reserving capacity on input does lower input latency.

**But the same floor from Round 3 caps it, and it is worth stating plainly.** Even a *one-shot* burst of 3000 cells produced a ~2.2 s blocking task — and that task is the **write pass itself** (the batched state updates), not the render. `smart` shrinks the render's contribution to input, but the render is a *minority* of the main-thread time under a heavy update; the synchronous write pass dominates, and no presentation scheduler — `renderQueue`, `pull`, `bounded`, or `smart` — chunks it. Principle 2 delivers its full promise only where **rendering** is the dominant main-thread cost (large DOM, expensive paints); where **state updates** dominate (Lume's synchronous-truth model under a storm), the ceiling on input is set by the un-chunked writes.

(Honest limits of this measurement: single runs under a throttle that drifted 12–26× between cases — take the *ordering* as the finding, not the exact milliseconds — and the freshness/convergence half of "best of both" was not cleanly isolated here, because the O(N) backlog poll I added to measure it saturates the throttled thread and starves the drain. The input result is clean; the convergence result is not, and is marked invalid in the data.)

### What this adds up to

The maintainer's two principles are right, and `smart` is the best-articulated design tested here: it never renders stale work (principle 1, which also fixes the freeze) and it measurably protects input (principle 2). The complete "smooth under heavy load" system, following the evidence across all four rounds, is three-layered and each layer targets a different cost:

1. **Reduce render work** — `content-visibility` (offscreen culling) raises the fps ceiling; nothing else does. *(Round 3.)*
2. **Render pull-based, drop-stale, cursor-fair, with an input-reserved budget** — `smart` — keeps presentation current and protects input from the *render's* share. *(Rounds 2 + 4.)*
3. **Time-slice the writes** — the one thing none of these do, and the remaining floor on both fps and input under heavy updates. This is the real open problem, and it trades against "state is synchronous truth," so it is a core-design decision, not an addon. *(Rounds 3 + 4.)*

`renderQueue` as shipped sits in none of these layers cleanly — it schedules the apply (layer 2's job) but with an unbounded queue and a starvation bug, doesn't reduce work (layer 1), and doesn't touch writes (layer 3). The KILL stands; the constructive path is `content-visibility` now, a `smart`-style pull renderer next, and — if Lume ever wants true smoothness under storm-scale writes — a time-sliced write mode as a deliberate core decision.

## Round 5: layer 3 — time-slice the write pass (`sliced`), and where the floor really is

The remaining floor after Round 4 was the synchronous write pass. `sliced` (in `main.js`) chunks it: the producer only *buffers* the latest intended value per cell (cheap, coalesced — drop-stale at the write layer), and one budgeted, input-reserved, cursor-fair loop applies a slice of writes to state **and** paints them each frame. Data: `results/layer3-summary.json`.

**The chunking works — at the JS level.** Instrumented, the producer pass runs in ~7 ms and the slice loop (including its batched flush) in ~16 ms per frame at 3000 cells; both respect the budget. There is no long JS task in my code. But input at 3000 cells (~1155 ms) is no better than `pull`/`off`, and a wall-clock "worst block" of ~2 s persists.

**A CPU profile (CDP, 20×) located the real floor: the Lume kernel write path.** Excluding 44% `(program)` throttle overhead, the hot self-time is `set` (12.2%) + `notifySubscribers` (9.7%) + `flushBatchedStates` (5.5%) ≈ **27% of active CPU** — spent updating state, and this is with **zero subscribers** (the pull/sliced pattern has no effects). Writing N reactive values is inherently O(N) through this path; slicing spreads that cost across frames but does not reduce the total, so at storm scale it still dominates. Two concrete consequences worth acting on:

- **`notifySubscribers` (state.js:131) allocates `Array.from(pendingNotifications)` and iterates on every flush even when a store has no listeners.** In the pull/sliced pattern that is ~10% of CPU spent notifying nobody. A no-subscriber fast-path in the kernel is a real, shippable optimization (it would need the full artifact matrix, so it is a `src/` decision, not done here).
- **The truest pull renderer should bypass reactive state entirely for the high-churn layer** — hold plain data, skip `set`/`notify`/`flush` (the whole 27%). `sliced` writes Lume state unnecessarily; a plain-data pull layer is the untested but likely-biggest lever, and is item 2 in the handoff's "not tried yet."

**Methodology correction from this round:** wall-clock Long-Tasks / `worstBlock` under CPU throttle is inflated by throttle-inserted pauses (the profile shows the slice loop is 16 ms of *work* inside a task the API reports as ~2 s of *wall-clock*). Treat `worstBlock` as relative-only under a fixed throttle; input-delay is the clean absolute metric. This does not change earlier *relative* conclusions but it does mean the absolute block-time figures in Round 3 are throttle-inflated.

**Net:** the write pass is chunkable, but under it lies the kernel write path, which scheduling cannot cheapen — only a cheaper kernel write (no-subscriber fast-path) or not using reactive state for the churny layer (plain-data pull) can. See [`HANDOFF.md`](HANDOFF.md) for the full menu of what's been tried and the next-session candidates.

## Round 6: killing the write-path floor — kernel fast-path + plain-data pull

Round 5 ended on the kernel write path as the last floor and named two levers for it. Round 6 built and measured both. Data: `results/round6-writepath-floor.json`, `results/exp1-fastpath.json`, `results/exp2-plain.json`. The clean metric throughout is **`maxProducerMs` (`prod` in the matrix): the worst synchronous write-pass frame** — a direct duration of the 3000-cell write loop, not paint-dominated like input-delay and not throttle-inflated like `worstBlock`. (Input-delay is reported too, but it clusters across every mode because under a 20× throttle input is bound by the DOM paint, not the write pass — OFF, which never uses the fast path, swung 5875→2536 ms storm between two runs from throttle/GC alone. Take `prod` and the CPU profile as the signal; input as noisy corroboration.)

### Lever 1 — the kernel no-subscriber fast-path (`src/core/state.js`)

An unsubscribed store still paid the entire notify/flush machinery on every write: `pendingNotifications.set` → `scheduleFlush` → (inside `batch()`) enqueue into `batchedStates` → a flush that ran `Array.from(pendingNotifications)` and `takeEffects()` **to notify nobody**. In the pull/`sliced` pattern (reactive cells, zero effects) Round 5's profile put that at ~9 % of active CPU per storm frame, entirely wasted. The fix: track a live `listenerCount` (both `$subscribe` and effect subscriptions register through `addListener`, so both are counted) and short-circuit the `set` trap when `listenerCount === 0 && beforeFlushHooks.length === 0` — store the value on the target and return, skipping all downstream scheduling. A later `subscribe()` still fires immediately with the current value, so nothing is missed; `notifySubscribers` keeps a matching zero-listener guard for the beforeFlush-only path. **All 488 existing tests pass unchanged** — the fast path is behaviourally transparent, which is the strongest evidence it is correct and could graduate.

**Measured (20×, dot off, 3000 cells, throttle-controlled):**

| case | before | after | change |
|---|---|---|---|
| `pull` storm — worst write-pass frame | 156.4 ms | **16.3 ms** | ~10× (throttle even eased 23.1→22.5×) |
| `pull` dashboard — worst write-pass frame | 44.3 ms | **23.2 ms** | ~2× (only 8 % of cells write/frame) |

The CPU profile is unambiguous: `notifySubscribers` (was 5.2 %) and `takeEffects` (was 1.6 %) **vanish from the profile**; `flushBatchedStates` 0.7 %→0.1 %, `enqueueIfBatching` gone. The kernel write path drops from **~9 % → ~1.5 %** of active CPU (only the bare `set` trap remains). A single `set` on a store nothing observes is now essentially the cost of an `Object.is` check plus a property store — the reactive write on an unsubscribed store is as cheap as a plain assignment.

### Lever 2 — `plain`: pull renderer over plain data, no `state()` at all

The truest floor and the counterpart to Lever 1: hold the high-churn layer in a plain array and have the producer write it directly (no proxy, no `set`, no notify, no flush, no batch). The new `plain` mode's scheduling is byte-identical to `pull` (same budgeted, cursor-fair rAF poll); the **only** difference is the write layer, so `plain`-vs-`pull` isolates exactly the reactive-write cost that even the fast path cannot remove — the `Proxy` trap itself.

**Worst write-pass frame (`prod`), one matrix run:**

| regime | `off` | `pull` (fast-path) | `plain` (raw array) | `sliced` (buffer) |
|---|---|---|---|---|
| storm 3000 | 444.9 | 45.9 | **15.9** | 16.4 |
| dashboard 3000 | 91.7 | 14.4 | **8.0** | 8.7 |

A CPU profile of `plain` storm shows **97.4 % `(program)` and zero kernel write path** — no `set`, no `notifySubscribers`, no state.js `get` anywhere (the trace's only kernel samples are the once-per-second `ui` readout store). The write layer contributes essentially nothing; the frame is all DOM paint.

### What Round 6 settles

The kernel write path, storm/3000, went **~9 % → ~1.5 % → ~0 %** of active CPU across `pull`-before-fastpath → `pull`-after-fastpath → `plain`. **The fast path captures ~85 % of the available write-path saving while keeping the full reactive API.** The residual `pull`-over-`plain` gap after the fast path is small (~16 ms vs ~16 ms storm; ~14 ms vs ~8 ms dashboard) and is just the `Proxy` set trap — real, but a minority of an already-small write pass, and swamped by paint. So a pull/streaming renderer does **not** need to abandon `state()` for the churny layer: an unsubscribed store is now nearly free to write, and dropping to plain data buys only the last sliver at the cost of all reactivity.

Two caveats stand. Neither lever raises the **fps ceiling** — that is still Layer 1 (`content-visibility` / doing less render work); rescheduling and cheaper writes move the same total work around, they don't shrink the paint. And neither fixes **input under a pure storm** on its own, because at 3000 cells under 20× the frame is paint-bound; the write-pass win shows up as headroom (a shorter worst write frame, more thread left for input) rather than a clean input-latency drop in these throttled runs. What Round 6 removes is precisely the floor Round 5 diagnosed: the O(N) kernel write cost that scheduling could only spread, never reduce. The fast-path is the shippable half (a real, behaviourally-transparent core optimization worth graduating with the full artifact matrix); the plain-data layer is the theoretical floor that confirms how little is left underneath it.

## Round 7: composing the layers — `smart` + `content-visibility` (`smartcv`)

With the write floor gone (Round 6), the last open item was stacking the two presentation layers that each helped alone: Layer 1 (reduce render work — `content-visibility`) and Layer 2 (drop-stale, input-reserved pull — `smart`). The new `smartcv` mode runs the `smart` pull renderer on a `content-visibility:auto` grid. Data: `results/exp3-smartcv.json`. Metric: median input delay (the clean absolute), dashboard regime (cv's sweet spot), dot off, 20×.

**Dashboard, 3000 cells (all four at ~23×, clean):**

| mode | median input | fps | what it is |
|---|---|---|---|
| `off` | 1887 ms | 0.3 | baseline |
| `smart` | 1643 ms | 0.4 | scheduling only — barely helps |
| `cv` | 662 ms | 0.7 | paint culling only — the dominant lever |
| **`smartcv`** | **515 ms** | **1.0** | both — best input AND best fps |

The ordering *is* the finding. **Paint, not scheduling, is the bottleneck here:** `smart` alone (input-reserved pull) shaves only ~13 % off `off`, because rescheduling the same paint work doesn't reduce it — exactly Round 3's "only reducing work raises the ceiling." `cv` reduces the work (offscreen cells skip layout + paint) and wins 2.9× by itself. But the two **compose**: once `cv` has made paint cheap, `smart`'s input reservation is no longer swamped by it and adds a further 1.3× (662→515 ms), lifting fps from 0.7 to 1.0. `smartcv` is the best responsiveness configuration measured in the whole study.

**Dashboard, 8000 cells (taller grid → cv culls the offscreen rows; throttle drifted, read with care):**

| mode | median input | fps | throttle |
|---|---|---|---|
| `off` | 10419 ms | 0.1 | 21.2× |
| `smart` | 11382 ms | 0.1 | 24.9× |
| `cv` | 2090 ms | 0.3 | 39.1× |
| **`smartcv`** | **1744 ms** | **0.4** | 24.1× |

At 8000 the effect is starker, and a wrinkle appears. `smartcv` cuts input from `off`'s **10.4 s → 1.7 s (~6×)** at comparable throttle. `smart` *alone* is now *worse* than `off` (11.4 s vs 10.4 s): the pull sweep visits all 8000 cells every frame, and without cv culling that per-frame sweep overhead exceeds what plain per-cell effects cost — pull only pays off when **paint** (not the sweep) dominates, which cv arranges. The `cv`-vs-`smartcv` gap here is muddied by throttle drift (cv ran at 39× vs smartcv's 24×, inflating cv's absolute ms), so take the clean 3000-cell block as the ordering and this as directional confirmation that the composition holds and widens with grid size.

**Net — the constructive stack is now empirically complete and ordered.** **Layer 1 (`content-visibility`) is load-bearing** — the only lever that reduces the dominant cost (paint), and free CSS. **Layer 2 (`smart`) is a real but secondary multiplier** that only surfaces once Layer 1 has uncovered it (and can *hurt* at large grids if used without it). **Layer 3 (the write floor) is gone** (Round 6 fast-path), so it no longer caps either. The best-measured "smooth under heavy reactive load" configuration is `content-visibility` + a `smart`-style input-reserved pull renderer over fast-path'd (unsubscribed) stores — none of which is `renderQueue`, which sits in none of these layers cleanly. The KILL verdict stands; this is the thing to build instead.

## Round 8: the paint-floor probe (`canvas`) — how much headroom is even left

Round 7 concluded "paint, not scheduling, is the bottleneck" but did not quantify how much of the remaining input delay is *irreducible pixels* versus *DOM-per-cell overhead* that could still be won back. Round 8 answers that with the paint-floor probe — the exact counterpart to Round 6's `plain`. `plain` removed the reactive **write** cost to expose its floor; the new `canvas` mode removes the DOM **paint** cost: it keeps the reactive stores and the byte-identical `pull` schedule (budgeted, cursor-fair rAF, tracked `stores[i].value` reads), but paints each changed cell as a filled rect (+ number) into **one** `<canvas>` instead of mutating N individual DOM boxes. The only thing removed between `pull` and `canvas` is the per-cell DOM. Diagnostic only — it abandons the whole `data-*`/DOM model, so it can never ship; its job is to decide whether more scheduling research has any headroom. Data: `results/round8-item12-paintfloor.json`.

**Dashboard, 3000 cells, 20×, continuous typing, dot off (all cases within one 18–23× throttle band):**

| mode | median input | fps | worstBlock | what it isolates |
|---|---|---|---|---|
| `off` | 1977 ms | 0.3 | 3457 ms | baseline (sync effect per cell) |
| `smart` | 1432 ms | 0.4 | 2587 ms | pull scheduling only |
| `pull` | 1420 ms | 0.4 | 2401 ms | reactive read + DOM paint |
| `plain` | 1378 ms | 0.4 | 2485 ms | **write floor** (raw array, DOM paint) |
| `cv` | 648 ms | 0.9 | 1583 ms | offscreen paint culling |
| **`smartcv`** | **388 ms** | 1.3 | 842 ms | best shippable config |
| **`canvas`** | **16 ms** | **12.8** | 122 ms | **paint floor** (reactive read, no per-cell DOM) |

**The paint floor is 16 ms — 24× below the best shippable config (`smartcv`, 388 ms) and 89× below `off`.** `canvas` faced the *harshest* throttle of the batch (23.5× vs 18–23×), so the gap is if anything understated. The decomposition is now complete and each layer's share is measured, not inferred:

- **Reactive write cost is negligible.** `pull` (1420) vs `plain` (1378) differ by ~3 % — the Round-6 fast-path did its job; writing 240 unsubscribed stores/frame is no longer a meaningful share of input delay. (Confirms Round 6 on the input axis, where Round 6 could only show it on `prod`.)
- **DOM-per-cell paint is ~99 % of the remaining cost.** `pull` (1420) → `canvas` (16) with *identical* reactive reads and *identical* schedule: the entire 1404 ms difference is the browser styling, laying out, and painting individual DOM boxes. Removing them collapses input 89× and lifts fps from 0.4 to 12.8.
- **Even `smartcv` — with `content-visibility` containment already scoping invalidation — sits 24× above the floor.** `smartcv` (388) vs `canvas` (16): once you commit to a DOM element per cell, roughly 370 ms of style/layout/paint for the touched boxes is unavoidable at this scale, and no amount of scheduling touches it.

**What Round 8 decides (this was item 12's whole purpose): scheduling headroom is essentially exhausted.** Every scheduling idea in this study — `rq`, `simple`, `bounded`, `pull`, `smart`, `sliced` — moves *when* the same DOM writes happen; none change that there are N DOM writes, and Round 8 shows those writes are 99 % of the cost. `smartcv` is within a small constant of the best any *scheduler* can do inside the per-cell DOM model. The only remaining large levers both attack the DOM-box count directly, not the schedule: **(a) reduce the boxes the browser must render** — `content-visibility` (culls offscreen paint — already in `smartcv`), occlusion-driven write culling (don't even *write* offscreen cells — item 9), or true virtualization (no DOM at all for offscreen rows); **(b) leave the per-cell DOM model** — `canvas`/`OffscreenCanvas` (the 16 ms floor, but outside Lume's `data-*` scope). This reframes the remaining research: stop optimizing the schedule, start reducing the live DOM-box count.

One caveat worth noting for interpreting `canvas`'s numbers: its low input comes partly at the cost of staleness (backlog peak 2795, max staleness ~6 s), because it kept the same tiny 2 ms budget while painting far more cheaply than DOM — it *could* run a much larger budget and stay both fresh and responsive (cheap paint has budget headroom DOM does not). That larger-budget canvas point is a one-line follow-up, but it does not change the floor: 16 ms is what the same schedule costs once per-cell DOM is gone.

## Round 9: occlusion-driven write culling (`vis`) — a null result that confirms Round 8

Round 8 predicted the outcome of item 9 before it was built: if the O(N) sweep is not the bottleneck (paint is), then culling the sweep to only visible cells cannot move input. Round 9 built it and measured it. `vis` is `smartcv` plus an `IntersectionObserver` visible-set: the pull sweep and DOM writes touch **only** visible cells (cursor-fair within that set); offscreen cells are never written while hidden and refresh lazily on reveal (their stale `visLast` differs from the live value, so the loop repaints them the instant they scroll in). It stacks the `cv` class (paint culling) and `smart`'s input-reserved budget, so `vis`-vs-`smartcv` isolates exactly the sweep/write-culling contribution on top of paint culling. Data: `results/round9-item9-vis-8000.json`, `results/round9-item9-vis-scale.json`, `results/round9-vis-confirm.json`.

The occlusion is real and active: `visVisibleCount` reports the sweep touches **3556/8000** (44 %) and **4340/12000** (36 %) cells — the rest are culled from the sweep entirely. But it buys nothing on input. **Dashboard 12000, two clean runs (~22–23× both):**

| run | `smartcv` median input | `vis` median input |
|---|---|---|
| scale sweep | 1847 ms | 2508 ms |
| confirm | 2465 ms | 2419 ms |

**The direction flips between runs** — `smartcv` alone swings 1847→2465 ms (a 33 % spread) from throttle/GC noise — so `vis` and `smartcv` are **statistically indistinguishable on input**. Occlusion write-culling delivers no input benefit, exactly as Round 8's decomposition predicts: the sweep it removes was never a meaningful share of the frame (writes are ~3 % of input per Round 8), and the visible **paint** it can't remove is the bottleneck. If anything, concentrating the whole render budget on visible cells makes `vis` paint *more* visible boxes per frame than `smartcv` (which spreads its budget across the grid, some of it onto offscreen cells `cv` then defers) — so there is a mild mechanism *against* `vis` on input, not for it. (The 8000-cell runs are omitted from the comparison: the `vis` case drifted to 1.0× throttle twice — a known CDP flake — making its absolute ms meaningless there. The 12000 block ran clean.)

The one axis where `vis` moves is the **visible backlog**: it holds 920–1365 cells-behind vs `smartcv`'s 3061–3256, i.e. the visible region falls less far behind. But this is confounded — `vis`'s backlog counts only its ~4340 visible cells while `smartcv`'s counts all 12000 — and it does not surface in either input latency or worst-case staleness (both indistinguishable). **Verdict: occlusion write-culling does not raise the ceiling the way `cv` did.** The asymmetry is the whole point of Round 8: `cv` raised the ceiling because it culls **paint** (the dominant cost); `vis` only culls the **sweep/writes** (cheap), so it can't. The one scenario where occlusion *should* pay — active **scrolling**, where it avoids work on cells scrolling away and cheaply prioritizes newly-revealed rows — is untested here (the headless driver types but never scrolls); that, not static-viewport culling, is where a future occlusion experiment should look. `mode=vis` stays in the lab as the settled negative.

## Round 10: the paint-cost decomposition — per-cell text (layout) is a real secondary lever

Round 8 put ~99 % of remaining input on "DOM-per-cell paint" but did not split that into its parts. The apply does two things to each cell: sets a CSS custom property `--h` (background **paint**) and writes `textContent` (a number — which forces **layout**, because text metrics reflow). The lab's existing `text=0` flag drops the second, leaving colour-only cells. Round 10 runs the same modes with and without per-cell text to measure layout's share. Data: `results/round10-text1.json`, `results/round10-text0.json`. Dashboard 3000, 20×, dot off.

| mode | text=1 (number + colour) | text=0 (colour only) | change | throttle t1 / t0 |
|---|---|---|---|---|
| `off` | 1935 ms | 1569 ms | −19 % | 18.5× / 20.8× |
| `cv` | 889 ms | 437 ms | **−51 %** | 24.2× / 25.3× |
| `smartcv` | 411 ms | 318 ms | −23 % | 22.7× / 23.5× |
| `canvas` | 26 ms | 17 ms | −34 % | 22.8× / 27.9× |

**Dropping per-cell text roughly halves `cv`'s input cost and cuts `smartcv`'s by ~a quarter** — and note every `text=0` case ran at an *equal-or-harsher* throttle than its `text=1` pair (e.g. `cv` 25.3× vs 24.2×, `canvas` 27.9× vs 22.8×), which inflates the `text=0` number, so the true text/layout savings are **understated**. Per-cell text reflow is a genuine, in-scope lever: a colour-only dashboard cell (drive the visual with a CSS custom property or a class, keep the number out of the churny path or render it less often) is materially cheaper under heavy churn. The share is larger for `cv` (−51 %) than `smartcv` (−23 %) because `cv` applies every changed cell synchronously each frame (more text layouts per frame), while `smartcv`'s budget caps cells-per-frame, shrinking text's absolute contribution.

**But text is a *secondary* lever, not the floor.** Even colour-only, `smartcv` (318 ms) is still **19× above `canvas` (17 ms)**: once text/layout is gone, the residual is the per-cell **style recalc + background paint** of individual DOM boxes, which only leaving the per-cell DOM model (`canvas`) removes. So Round 10 refines Round 8 without overturning it: of the DOM-per-cell cost, per-cell text/layout is a real slice worth ~a quarter to a half depending on how much paint the scheduler already spread — worth shipping as guidance — but the dominant residual is still the DOM box itself. (Untested adjacent lever, next session: a direct `style.backgroundColor` write vs the inheriting custom property `--h`, to see whether custom-property style invalidation is a further slice of that residual.)

## Round 11: O(changed) dirty-list pull (`dirty`) — the sweep was never the bottleneck, so removing it doesn't help

Item 10 asked whether replacing the O(N) per-frame sweep with an O(changed) dirty-list — fed by the cheapest possible kernel change-signal — moves the needle. The signal is a new kernel `EXPERIMENT` (`src/core/state.js`): an opt-in `__setDirtySink(set)` that, inside the **no-subscriber fast path**, adds each changed store's target to a sink Set — O(1), no notify/flush, so it preserves the Round-6 fast path (unlike a `$subscribe`/`beforeFlush` per store, which would pull the write back onto the full notify path). `mode=dirty` installs the sink, stacks `cv` + `smart`'s input-reserved budget, and drains the sink each frame (drop-stale: reads current value; budget leftovers persist, no starvation). So `dirty`-vs-`smartcv` isolates exactly **O(changed) drain vs O(N) sweep**, everything else equal. **All 488 tests pass** with the kernel change (the null-check is free when no sink is installed — behaviourally transparent, like the Round-6 fast path). Data: `results/round11-dirty-*.json`.

| case | `smartcv` (sweep) | `dirty` (drain) | throttle (smartcv/dirty) | read |
|---|---|---|---|---|
| dashboard 3000 | 449 ms | 483 ms | 23.4× / 21.4× | indistinguishable |
| dashboard 12000 (clean) | 1824 ms | 2464 ms | 23.3× / 24.2× | dirty ~35 % **worse** |
| storm 3000 | 458 ms | 360 ms | 17.9× / 23.6× | dirty better *despite harsher throttle* |

**No consistent input advantage — the direction changes with the regime and stays inside the study's throttle-drift noise band** (recall `smartcv` alone swung 1847→2465 between two 12000 runs in Round 9). This is the Round-8 verdict a third time: input is paint-bound, so a change to how the renderer *finds* what changed operates on the ~1 % of the frame that isn't paint and cannot move input. The sweep it removes was never the bottleneck — and, importantly, the O(N) sweep is not actually O(N) *per frame*: the budget breaks it after a few paints, and locating those paints scans only ~paints/churn cells (a few hundred at most), not all N. There was little scan to remove.

Two concrete, non-noise findings do stand out, and both cut *against* the dirty list:

- **The change-signal taxes the hot write path.** At dashboard 12000 the write-pass `prod` is **61 ms for `dirty` vs 42 ms for `smartcv`** — the per-write `sink.add` is real cost, paid on every changed write (the hot path) to save work on the sweep (a cold path that wasn't the bottleneck). O(changed) is not free; it moves cost onto writes and partially gives back what the Round-6 fast path won. This is exactly the "would it defeat the fast path?" tension the handoff flagged — measured, the answer is "it adds measurable write-path cost."
- **A Set is the wrong structure.** The clean 12000 result has `dirty` losing to the plain array sweep, plausibly because `Set` add/delete/iterate churn on a backlog of thousands is costlier than the sweep's monomorphic array reads (which V8 makes almost free). A flat dirty-*array* with a per-store dedupe flag (the handoff's "dirty ring") would likely close that constant-factor gap — but it cannot change the structural verdict, because the frame is paint-bound regardless of how cheaply you enumerate the changes.

The one unambiguous win is **measurement, not performance**: `dirty`'s backlog is `dirtySink.size`, an O(1) read — the only mode that sidesteps the O(N) convergence-poll that Round 4 flagged as saturating the throttled thread. If a future round wants clean freshness/convergence curves, `dirty` is the mode to measure them on. **Verdict: O(changed) dirty pull is not a responsiveness lever** (input is paint-bound; the sweep was never the cost; the signal taxes writes) — it is, at best, an O(1)-backlog measurement aid. Item 10 joins item 9 as a scheduling/data-side idea that Round 8 correctly predicted would not move input.

## Round 12: off the main thread — Web Worker + OffscreenCanvas (`worker`, `whybrid`) — the paint floor breaks

Rounds 8–11 exhausted the scheduling and data-side frontier: with DOM-per-cell paint fixed at ~99 % of input delay (Round 8), no schedule and no change-signal could move the needle. Round 8 named the two levers that remained — reduce the live DOM-box count (occlusion/virtualization, which only approach `cv`, never the floor) or **leave per-cell DOM for a canvas** — and flagged the second, moved *off the main thread*, as "the only way past the paint floor while keeping a canvas-like model," a big architectural bet that was out of scope until now. Round 12 takes the bet and measures it. Two new modes; both render to one `OffscreenCanvas` via `transferControlToOffscreen()`, so there is zero per-cell DOM:

- **`worker`** — the ceiling probe. A dedicated worker owns the cell values, runs the regime **producer**, **diffs** against last-painted, and **paints** changed cells into the OffscreenCanvas. The main thread does *no* per-frame render work at all — it only ships the canvas over and handles input. This is `plain` (no `state()`) but entirely off-thread; it answers the ceiling question (is off-threading worth it), not the integration one.
- **`whybrid`** — the realistic Lume-integration probe. Reactive `state()` stays on the **main thread**; a `smart`-style input-reserved, cursor-fair loop diffs the stores and posts each changed cell to the worker (a flat `[i, v, …]` `Float32Array`, transferred zero-copy) which blits it. The main thread still pays the diff + serialize + `postMessage`; only the paint is off-thread. This is what an actual Lume app — whose state lives on the main thread — would have to do to use an OffscreenCanvas.

Data: `results/round12-headline.json` (free-core worker), `results/round12-worker-throttled.json` (software slow-device throttle), `results/round12-scale8000.json`.

**A measurement fact that shapes everything: CDP CPU throttling does not reach a dedicated worker.** The driver's `Emulation.setCPUThrottlingRate` throttles only the page's main thread; playwright-core here cannot even attach an `Emulation` session to a worker target, and the worker's own 2M-iteration busy-probe reads ~1× under the page's 20× throttle (`worker.probe.slowdown` ≈ 0.6–1.3 in every result). So a bare `worker` run compares a *throttled* main thread against a *native-speed* worker — the "worker gets a free fast core" analogue (optimistic, but a real scenario on multi-core hardware). To get the honest slow-device number we added a **software frame-stretch** in the worker (`?wrate=`/`--wthrottle`): each frame busy-loops until its wall time is R× its measured compute — the same "make CPU time R× longer" mechanism CDP uses on the main thread, applied at frame granularity (fine here: a worker has no input to preempt). Both numbers are reported.

**Headline, 3000 cells, 20×, dot off, continuous typing (median input ms):**

| mode | storm 3000 | dashboard 3000 | dashboard 8000 | main-thread free % | what it isolates |
|---|---|---|---|---|---|
| `off` | 2612 | 1442 | — | 0–9 | baseline |
| `smartcv` | 660 | 603 | 1576 | 0 | best DOM config (Rounds 7–8) |
| `canvas` | 32† | 32.5 | — | 33 | main-thread paint floor (Round 8) |
| **`worker`** (free core) | **10.5** | **5.8** | **9.2** | **77–93** | off-thread produce+diff+paint |
| **`whybrid`** (state on main) | **42.4** | **21.5** | **47.7** | 22–43 | off-thread *paint only* |

†`canvas` storm drifted to 6.5× throttle (a known CDP flake), so its 32 ms is optimistic there; the dashboard `canvas` (32.5 ms @ 25×) is the solid floor. `whybrid` storm/dashboard ran at 15–18× (lighter than the others), so its input is modestly flattered — but the gap to `smartcv` is an order of magnitude, far outside drift.

Three things fall out, and they are the point of the whole study's endgame:

- **Off-threading breaks the paint floor Round 8 said was irreducible.** The pure `worker` holds **5.8–10.5 ms input at 3000 and 9.2 ms at 8000** — 60–170× below `smartcv` and *below even the main-thread `canvas` floor* (32 ms), because `canvas` still paints on the main thread under a tiny input-reserving budget, while `worker` moves the paint off the main thread entirely and leaves it 77–93 % free. Round 8's floor was the floor *for the main thread*; it is not the floor once the paint leaves the main thread.
- **Input decouples from render load — even when the worker itself is slow.** With the software 20× throttle applied to the worker (the honest slow-device case), the main thread still holds **4.8–6.7 ms input** while the worker's *pixel freshness* collapses gracefully: worker paint fps 40→22→7→2.4 as the load climbs (dashboard 3000 → dashboard 8000 → storm 3000 → storm 8000), worst worker frame 72→186→626 ms. Nothing about that slowness touches input, because input no longer shares a thread with paint. This is the qualitative change the whole study was reaching for: every earlier mode traded *when* the paint blocks input; `worker` makes the paint unable to block input at all.
- **You do not have to abandon main-thread reactive state to get most of it (`whybrid`).** Keeping `state()` on the main thread and moving *only the paint* off-thread still buys **15–33× input** over `smartcv` (21.5 ms vs 603 at dashboard 3000; 47.7 vs 1576 at 8000). The residual cost over the pure `worker` (5.8 → 21.5 ms) is exactly the main thread's budgeted diff + serialize + `postMessage` — real, but an order of magnitude cheaper than painting N DOM boxes. The tradeoff is the familiar drop-stale one: under extreme load the budgeted push falls behind (max staleness ~2 s at 3000, ~4.5 s and backlog ~5900 at 8000), so pixels lag while input stays crisp — the same bargain `smart`/`pull` strike, now with the paint cost removed from the main thread.

**Verdict: the worker pipeline is the only lever in the entire study that breaks the paint floor — proven IN as a capability, but OUT of the `data-*` DOM model.** It works, decisively, and it is the last remaining unlock with real headroom (Round 8 predicted exactly this and nothing else would). But it wins *by leaving the DOM*: an OffscreenCanvas has no per-cell elements, so it forfeits everything the DOM cell gives you — `data-*` bindings, per-cell event handlers, CSS/`className` handlers, accessibility, text selection, hit-testing. That is not a tuning detail; it is the whole reason Lume renders to DOM. So this does **not** graduate into the `data-*` core or change any existing handler. Where it belongs, if anywhere, is a **separate opt-in canvas-renderer addon** for the narrow class of content a canvas actually suits — high-churn numeric grids, heatmaps, sparkline walls, dashboards where cells are coloured rects, not interactive elements. `whybrid` proves the reactive half integrates cleanly (main-thread `state()` → diff → transfer → blit), so such an addon is *buildable* on today's kernel with no core change; its ceiling is `worker`, its realistic operating point is `whybrid`. The decision to build it is a product-scope call (is the canvas-shaped audience worth a new addon and its Chrome-69+/OffscreenCanvas floor?), not a research one — the research question ("can anything beat the DOM paint floor, and at what cost?") is now answered: **yes, an off-thread canvas, at the cost of the DOM.**

## Reproducing

```bash
npm run dev -- --port 5199 --strictPort          # serve examples
PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 npm i --no-save playwright-core
node examples/render-queue-lab/sweep.mjs          # full matrix (dot on)  → results/summary-full.json
node examples/render-queue-lab/sweep.mjs clean     # clean matrix (dot off) → results/*-nodot-type.json
# round-2 follow-ups:
node examples/render-queue-lab/round2.mjs starve   # the starvation bug + bounded/pull fairness
node examples/render-queue-lab/round2.mjs compare  # all modes incl. bounded + pull → round2-summary.json
xvfb-run -a node examples/render-queue-lab/round2.mjs fidelity   # headless vs headed
node examples/render-queue-lab/headroom.mjs storm 20   # fps ceiling + main-thread free % (20x)
node examples/render-queue-lab/headroom.mjs dashboard 1 # native ceiling (1x); arg4 = custom cell counts
node examples/render-queue-lab/smart.mjs            # smart (drop-stale + input-reserved budget) vs fixed-budget pull
node examples/render-queue-lab/run.mjs --mode sliced --regime dashboard --cells 3000 --nodot --type  # layer 3
# round-6 write-path floor (kernel fast-path + plain-data pull):
node examples/render-queue-lab/matrix.mjs --modes off,pull,plain,sliced --regimes storm,dashboard --cells 3000 --nodot --type  # prod = worst write-pass frame
node examples/render-queue-lab/profile.mjs --mode pull --regime storm --cells 3000   # before/after the fast-path: watch notifySubscribers/takeEffects vanish
node examples/render-queue-lab/profile.mjs --mode plain --regime storm --cells 3000  # zero kernel write path (the floor)
# round-7 composing the presentation layers (smart + content-visibility):
node examples/render-queue-lab/matrix.mjs --modes off,cv,smart,smartcv --regimes dashboard --cells 3000,8000 --nodot --type
# round-8 paint-floor probe (canvas) — the decomposition that shows DOM-per-cell is ~99% of remaining input delay:
node examples/render-queue-lab/matrix.mjs --modes off,cv,smart,smartcv,pull,plain,canvas --regimes dashboard --cells 3000 --nodot --type --measure 6000
# round-9 occlusion write-culling (vis) — null result on input (use the 12000 block; 8000 vis-throttle is flaky):
node examples/render-queue-lab/matrix.mjs --modes cv,smartcv,vis --regimes dashboard --cells 8000,12000 --nodot --type --measure 6000
# round-10 paint-cost: per-cell text (layout) share — run twice, with and without text:
node examples/render-queue-lab/matrix.mjs --modes off,cv,smartcv,canvas --regimes dashboard --cells 3000 --nodot --type --measure 6000            # text=1
node examples/render-queue-lab/matrix.mjs --modes off,cv,smartcv,canvas --regimes dashboard --cells 3000 --nodot --notext --type --measure 6000   # text=0
# round-11 O(changed) dirty pull vs O(N) sweep (isolate drain-vs-sweep: both stack cv+smart budget):
node examples/render-queue-lab/matrix.mjs --modes smartcv,dirty --regimes dashboard,storm --cells 3000,12000 --nodot --type --measure 6000
# round-12 off-main-thread (Worker + OffscreenCanvas): worker = full off-thread pipeline, whybrid = paint-only off-thread (main-thread state):
node examples/render-queue-lab/matrix.mjs --modes off,smartcv,canvas,worker,whybrid --regimes storm,dashboard --cells 3000 --nodot --type --measure 6000  # headline (worker on a free core)
node examples/render-queue-lab/matrix.mjs --modes worker --regimes storm,dashboard --cells 3000,8000 --nodot --type --wthrottle --measure 6000                # honest slow-device: software-throttle the worker at --rate
# CDP throttling does NOT reach a dedicated worker (worker.probe.slowdown ≈ 1 under the page's 20×); --wthrottle applies a software frame-stretch instead. See worker-paint.js.
# single case:
node examples/render-queue-lab/run.mjs --mode pull --regime storm --cells 3000 --nodot --type --out results/one.json
```

Open `http://localhost:5199/examples/render-queue-lab/?mode=pull&regime=storm&cells=3000` and flip the URL params to drive it by hand: `mode` = `off`/`rq`/`simple`/`adaptive`/`cv`/`bounded`/`pull`/`smart`/`sliced`/`plain`/`smartcv`/`vis`/`dirty`/`canvas`/`worker`/`whybrid`, plus `regime`, `cells`, `budget`, `churn`, `dot` (0 to remove the jank-dot artifact), `text` (0 for paint-only apply), `render` (0 to keep the flush but skip DOM writes), `wrate` (worker-mode software slow-device throttle, 1 = native/free core). Every result JSON embeds its own throttle probe so numbers are self-describing; `worker`/`whybrid` also embed the worker's own busy-probe (which shows CDP throttling does not reach it). The Round-6 kernel fast-path lives in `src/core/state.js` (marked `// EXPERIMENT:`); to A/B it, `git stash` that file and re-run the profile/matrix above.
