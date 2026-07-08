# Kickoff prompt — build Lume Mission Control

Copy everything in the block below into a fresh Claude Code session opened
on this repository (Opus or Sonnet; give it a generous budget — this is a
multi-hour build). Works locally or on claude.ai/code pointed at
`sathvikc/lume-js`.

---

```text
You are building "Lume Mission Control", the flagship showcase app for this
repository (Lume.js).

Setup:
- Create and work on a branch named feature/mission-control (from main).

Your complete instructions live in the repo — read them in this order
before writing any code:
1. examples/mission-control/CLAUDE.md   (your working contract)
2. examples/mission-control/VISION.md   (what to build and why)
3. examples/mission-control/PLAN.md     (milestones M0–M5 with acceptance
                                         criteria and file layout)
4. AGENT_GUIDE.md                       (how to write correct Lume code —
                                         the eight rules are non-negotiable)

Then build the app milestone by milestone, exactly per PLAN.md:
- One commit minimum per milestone, conventional commit messages
  (feat(examples): mission-control M2 — fleet table).
- Verify each milestone in a real browser (npm run dev →
  http://localhost:5173/examples/mission-control/) before starting the
  next. Use a headless browser to screenshot if available.
- Do not modify anything outside examples/ except the one card added to
  examples/index.html in M5.
- Replace the placeholder examples/mission-control/index.html with the
  real app as part of M0.

When all M0–M5 acceptance criteria and the five success criteria in
VISION.md pass, push the branch and open a pull request to main titled
"feat(examples): Lume Mission Control — flagship showcase app". The PR
description must include: measured FPS and worst-frame at 30 ticks/sec,
total app JS bytes, a table of which Lume primitives are used where, and
any library friction you hit while dogfooding (this feedback is a primary
deliverable, not a footnote).

If you find what looks like a bug in Lume itself (src/), do NOT work
around it silently and do NOT edit src/ — document it precisely in the PR
description and, where possible, isolate it in a minimal repro snippet.
```
