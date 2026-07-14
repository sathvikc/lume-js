# renderQueue — research findings and go/no-go verdict

> Research session, 2026-07-14. Branch: research (off latest `main`). The experimental `renderQueue` addon was cherry-picked from the frozen `feature/render-queue` branch (originally `c3864fe`) so it is importable; the silent 8→9 KB budget raise that shipped with it was **reverted** here so the addon's real cost is measured, not hidden. This file is the artifact the maintainer reviews. Testbed: [`examples/render-queue-lab/`](.); drivers: [`run.mjs`](run.mjs), [`sweep.mjs`](sweep.mjs); raw per-case JSON: [`results/`](results/).

## Verdict — KILL (do not ship, not even experimental)

The freeze reproduces immediately and is root-caused: it is a structural mismatch between the drain's per-frame *time* budget and the load's per-frame *count* of re-dirties, with no fix that doesn't reintroduce the input jank the addon exists to prevent. Across realistic regimes renderQueue delivers at most a ~1.5× median input-latency improvement (target: ≥5×), while freezing the presentation under sustained load. A 15-line rAF coalesce matches it without freezing; `content-visibility: auto` — free, zero-JS, standards-only — beats it 2–3×. It is also 0.37 KB over the all-in-one bundle budget. Four of five SHIP criteria fail.

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

## Reproducing

```bash
npm run dev -- --port 5199 --strictPort          # serve examples
PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 npm i --no-save playwright-core
node examples/render-queue-lab/sweep.mjs          # full matrix (dot on)  → results/summary-full.json
node examples/render-queue-lab/sweep.mjs clean     # clean matrix (dot off) → results/*-nodot-type.json
# single case:
node examples/render-queue-lab/run.mjs --mode rq --regime dashboard --cells 3000 --nodot --type --out results/one.json
```

Open `http://localhost:5199/examples/render-queue-lab/?mode=rq&regime=storm&cells=3000` and flip `mode`/`regime`/`cells`/`budget`/`dot` in the URL to drive it by hand. Every result JSON embeds its own throttle probe so numbers are self-describing.
