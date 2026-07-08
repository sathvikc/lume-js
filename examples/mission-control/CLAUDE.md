# CLAUDE.md — Building Lume Mission Control

You are building the flagship showcase app for Lume.js inside its own
repository. This file is your working contract; read it fully before
writing code.

## Read these first, in order

1. `../../AGENT_GUIDE.md` — how to write correct Lume code. The eight
   rules there are non-negotiable; most bugs in Lume apps come from
   violating rule 1 (mutating arrays/nested objects) or rule 3 (asserting
   before the microtask flush).
2. `VISION.md` (this folder) — what you are building and why.
3. `PLAN.md` (this folder) — the milestone order, file layout, and
   acceptance criteria. Build in that order. Do not skip ahead.
4. When an API detail is unclear: `../../llms-full.txt` contains every
   guide and API page; `../../docs/api/` has the individual pages.

## Ground rules

- **This is a showcase.** Every line may be read by a skeptical framework
  engineer. Idiomatic Lume, immutable updates, explicit cleanup, no dead
  code, no TODOs left behind.
- **Imports:** use `import { … } from 'lume-js'` / `'lume-js/addons'` /
  `'lume-js/handlers'`. The repo's vite dev server maps these to `src/`
  (see `vite.config.js`) — do not import from `../../src/...` directly.
- **No dependencies.** No npm installs, no CDN scripts, no CSS frameworks,
  no icon fonts. Hand-written CSS with custom properties. Canvas sparklines
  are hand-rolled (~30 lines).
- **No build step for the app.** Plain ES modules, valid HTML (it should
  pass an HTML validator), `data-*` values are state keys only — never
  expressions.
- **Performance is a feature.** One `batch()` per simulator tick wraps all
  store writes. Fine-grained: one effect per telemetry cell, keyed
  `repeat()` for rows. If you're re-rendering a list to update one cell,
  you're doing it wrong.
- **Cleanup is not optional.** Everything disposable goes into a
  `createCleanupGroup()`; panel swaps must dispose what they replace.
  A leaked effect is a failed milestone.
- **Simulator purity:** `simulator.js` imports nothing from Lume and never
  touches the DOM. It must run under plain Node.

## Repo conventions that apply to you

- Conventional commits (`feat(examples): …`), one milestone per commit
  minimum; the repo's `AGENTS.md` quality-gate scripts (`npm run lint`,
  coverage) target `src/` and won't block you, but keep example code to
  the same standard.
- Do not modify anything outside `examples/` except the single card you
  add to `examples/index.html` in M5.
- Do not bump the package version, touch `dist/`, or edit `src/`. If you
  believe you found a bug in Lume itself, stop and report it instead of
  working around it silently — this app is also a dogfooding exercise, and
  library friction it exposes is valuable output. Note it in your final
  summary.

## How to run and verify

```bash
npm install        # once
npm run dev        # vite dev server
# open http://localhost:5173/examples/mission-control/
```

Verify **in a real browser** at every milestone (the protocol is at the
bottom of `PLAN.md`). If you have a headless browser available, drive the
page and screenshot it; otherwise reason from the HUD's own numbers and
say exactly what you verified and how. Never claim a milestone done
without having loaded the page.

## Definition of done

All five success criteria in `VISION.md` verified and the M0–M5 acceptance
checks in `PLAN.md` pass. Final commit updates `examples/index.html` with
the Mission Control card. Your closing summary lists: measured FPS/worst
frame at 30 t/s, total app JS bytes, which Lume primitives were used where,
and any library friction encountered.
