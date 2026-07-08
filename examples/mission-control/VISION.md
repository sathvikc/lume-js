# Lume Mission Control — Vision

## What this is

The flagship showcase app for Lume.js: a real-time **satellite fleet
operations dashboard** that looks and behaves like something built with a
45 KB framework and a build pipeline — except it is one HTML file, one CSS
file, and a handful of plain ES modules importing a **2.66 KB** library,
view-source-able end to end.

It exists to make one argument, viscerally: *fine-grained standards-only
reactivity handles brutal real-time workloads that virtual-DOM frameworks
need hand-tuned memoization for — in two orders of magnitude less
JavaScript.*

## The demo moment

A visitor lands and, without clicking anything, sees:

1. A dense wall of live data — 1,000+ DOM nodes updating every tick — that
   stays perfectly smooth, with an always-visible perf HUD (FPS,
   updates/sec, tick rate) proving it.
2. A **"View Source"** button. Clicking it shows the entire app: readable
   HTML with `data-*` attributes, plain JavaScript modules. No JSX, no
   compiled output, no bundle. That's the mind-blow.
3. A **"Stress"** control. Cranking the tick rate to maximum barely moves
   the frame time — because every tick is one `batch()` and every DOM node
   has its own surgical effect.

## The scenario

A fictional operator console for a fleet of **200 satellites**, each
streaming telemetry (battery %, temperature, signal strength, orbital
status). A simulated feed drives the whole app — no network, deterministic
with a seedable RNG, so the demo works offline and identically for everyone.

## Screens & regions (single page, CSS grid)

```
┌──────────────────────────────────────────────────────────────┐
│ HEADER  logo · fleet stats bar · perf HUD · theme · source   │
├───────────────────────────────┬──────────────────────────────┤
│ FLEET TABLE (200 rows,        │ DETAIL PANEL (selected sat)  │
│ sortable, filterable,         │ live sparklines (canvas),    │
│ live cells, row selection)    │ status controls, event log   │
├───────────────────────────────┴──────────────────────────────┤
│ TELEMETRY WALL  1,000 live channel cells (heatmap tiles)     │
├──────────────────────────────────────────────────────────────┤
│ FOOTER  feed controls: pause/resume · tick rate · stress ·   │
│         alert stream (capped rolling log)                    │
└──────────────────────────────────────────────────────────────┘
```

### Header
- **Fleet stats bar**: satellites online / degraded / critical, mean
  battery, mean signal — derived via `effect()` writing into a `ui` store,
  rendered with `data-bind`.
- **Perf HUD** (always visible; this is the pitch): FPS, worst frame (last
  1s), state updates/sec, current tick rate, and "2.66 KB runtime · no
  build" badge. Numbers must be real, measured via `requestAnimationFrame`.
- **Theme toggle** (dark default / light), persisted with `persist`.
- **View Source** button → opens the repo path on GitHub in a new tab, plus
  a modal listing the actual files and byte counts.

### Fleet table (the framework-parity proof)
- 200 rows rendered with `repeat()` (keyed by satellite id, element reuse).
- Columns: ID, name, status pill, battery (bar + %), temp, signal, last
  contact. Cells update live without re-rendering rows.
- Click a column header → sort (asc/desc). Type in the filter box → filter
  by name/status. Sorting/filtering are **immutable array derivations**
  (rule: never mutate `store.satellites` in place).
- Click a row → select (highlight + detail panel). Selection must survive
  sorting and filtering.

### Detail panel
- Shows the selected satellite: name, status, and **two live canvas
  sparklines** (battery & signal, last 120 samples) redrawn from a `watch`
  on the selected id's ring buffer.
- Buttons: "Reboot" (status → BOOTING for 3s then ONLINE, event logged),
  "Decommission" (removes from fleet — exercises keyed removal in
  `repeat`).
- Empty state when nothing selected.

### Telemetry wall
- 1,000 cells (e.g. 5 channels × 200 satellites) as a compact heatmap
  grid. **One independent store + one effect per cell** — this is the
  fine-grained flex; cells change color/intensity per tick with zero
  full-list re-render.

### Footer / feed controls
- Pause / resume feed.
- Tick rate slider: 1–60 ticks/sec.
- **Stress button**: 10× burst mode for 5 seconds; HUD shows the frame
  time barely flinching.
- Alert stream: threshold crossings (battery < 15%, temp > 80°C, signal
  lost) appended to a capped (50-entry) rolling list via `repeat`.

## Non-goals

- No server, no real WebSocket, no fetch. The simulator is a pure JS
  module emitting ticks.
- No router, no multi-page. One dense screen.
- No external UI libraries, icon fonts, or CSS frameworks. Hand-written
  CSS (custom properties for theming).
- Not a benchmark page — the batch() benchmark example already exists.
  This is a *product-feeling* app.

## Success criteria

1. On a 2020-class laptop at 30 ticks/sec: steady 60 FPS, worst frame
   < 24 ms while interacting (sorting, filtering, selecting).
2. Total app JS (excluding Lume) ≲ 25 KB unminified across ≤ 8 readable
   modules; zero build step — works from `npm run dev` and from any static
   file server.
3. Every Lume primitive appears naturally at least once: `state`,
   `effect` (auto + explicit deps), `batch`, `bindDom`, `computed`,
   `watch`, `repeat` (template mode AND create/update mode), `persist`,
   `createCleanupGroup`, plus at least two handlers (`show`,
   `classToggle`/`on`) and one custom handler.
4. HTML validates; `data-*` values are plain state keys only.
5. A framework engineer reading the source finds nothing to sneer at:
   immutable updates everywhere, cleanup on every disposable, one
   `batch()` per simulator tick.
