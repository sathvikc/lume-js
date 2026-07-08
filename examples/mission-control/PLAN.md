# Lume Mission Control — Build Plan

Ordered milestones. Each has acceptance criteria; do not start a milestone
until the previous one's criteria pass **in a real browser**. Commit at
every milestone boundary (conventional commits, e.g.
`feat(examples): mission-control M2 — fleet table`).

## File layout (target)

```
examples/mission-control/
  CLAUDE.md          # how to build (read first)
  VISION.md          # what to build
  PLAN.md            # this file
  index.html         # all markup — semantic, data-* bindings, <template> rows
  style.css          # hand-written CSS, custom properties for theming
  main.js            # composition root: stores, bindDom, wiring, cleanup
  simulator.js       # pure data-feed module (no DOM, no Lume imports)
  stores.js          # store definitions + derived-state effects
  table.js           # fleet table: repeat(), sorting, filtering, selection
  detail.js          # detail panel + canvas sparklines
  wall.js            # telemetry wall (1,000 fine-grained cells)
  hud.js             # perf HUD (FPS/worst-frame/updates-per-sec meters)
```

Keep modules under ~200 lines each. `simulator.js` must be importable in
Node (no DOM references) — it's the piece unit-testable without a browser.

## M0 — Scaffold + simulator

- Static layout shell (header/table/detail/wall/footer grid) with placeholder
  content, dark theme.
- `simulator.js`: seedable PRNG (mulberry32 is fine); emits
  `onTick(listener)` at a configurable rate; each tick produces a full
  snapshot delta for 200 satellites × 5 channels. `start/stop/setRate/burst`
  API. Satellite model: `{ id, name, status, battery, temp, signal,
  lastContact, history: ringBuffer }`.
- **Accept:** `node -e "import('./simulator.js').then(...)"` runs ticks
  headlessly; page renders the static shell with no console errors.

## M1 — Stores, stats bar, perf HUD

- `stores.js`: `fleet` store (satellites array, replaced immutably per
  tick), `ui` store (selection, sort, filter, theme, feed state), `stats`
  store (derived aggregates). One `batch()` wraps ALL writes of a tick.
- Stats bar and HUD live via `data-bind`. HUD measures real FPS + worst
  frame via rAF, updates/sec counted at the simulator boundary.
- **Accept:** with feed running at 30 t/s, stats bar + HUD update live;
  pausing the feed freezes stats but HUD keeps measuring; zero per-tick
  allocations growing unbounded (heap flat over 60 s in DevTools).

## M2 — Fleet table

- `repeat()` in create/update mode, keyed by `sat.id`; sortable headers
  (aria-sort), filter input (`data-bind="filter"`), row selection
  (`data-onclick` or delegated listener), status pill via `classToggle`.
- Sorted/filtered view derived in an `effect` writing `ui.visibleSats` —
  the source array is never mutated.
- **Accept:** sorting/filtering/selecting stay correct while the feed runs
  at 30 t/s; selection survives re-sorts; removing a satellite
  (decommission stub) removes exactly one row without disturbing others
  (verify element identity in DevTools).

## M3 — Detail panel + sparklines

- `watch(ui, 'selectedId', …)` swaps the panel content; two canvas
  sparklines redrawn per tick from the selected satellite's ring buffer
  (redraw inside the existing tick effect — no extra timers).
- Reboot / Decommission buttons with event log entries.
- **Accept:** selecting rows swaps panels with no leaked effects (dispose
  count matches create count — expose a debug counter); sparklines scroll
  smoothly; decommission removes from table, wall, and stats coherently in
  one batch.

## M4 — Telemetry wall + alerts + feed controls

- 1,000 cells, one small store + one effect each (see the batch example's
  grid for the pattern); cells colored by channel value.
- Alert stream: capped 50-entry array via `repeat` template mode, newest
  first.
- Footer controls: pause/resume, tick-rate slider (1–60), 5-second 10×
  stress burst.
- **Accept:** at 30 t/s with the wall live, FPS ≥ 55 on a mid laptop;
  stress mode keeps worst frame < 50 ms; alerts cap at 50 without leaking.

## M5 — Polish + ship

- Light theme + toggle persisted (`persist(ui, 'mission-control', { keys:
  ['theme'] })`); custom handler (e.g. `data-trend` arrow) to demo
  extensibility; View Source button + file/byte-count modal; empty states;
  keyboard focus styles; `aria-live` on alerts.
- Add the card to `examples/index.html`; replace this folder's placeholder
  `index.html` note in the card copy.
- Final pass against VISION.md success criteria 1–5, one by one, in the
  browser. Record numbers in the PR/commit description.
- **Accept:** all five success criteria verifiably met; `npm run lint`
  clean if lint scope includes examples (it currently doesn't — still keep
  the code idiomatic); page works served statically (`npx serve examples`
  equivalent) — no vite-only tricks besides the `lume-js` import mapping
  (use relative `../../src/index.js` imports OR document the dev-server
  requirement; prefer importing from `'lume-js'` to match other examples).

## Verification protocol (every milestone)

1. `npm run dev` → open `http://localhost:5173/examples/mission-control/`.
2. Interact with everything you just built; watch the console (zero
   errors/warnings tolerated).
3. Performance check: DevTools performance panel or the app's own HUD.
4. Leak check: create/destroy the thing 20× (select rows, toggle panels),
   heap snapshot before/after.
