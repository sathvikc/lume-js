## Summary

<!-- One paragraph: what this PR does and why. Link related issues: Closes #123 -->

## Type of change

<!-- Check all that apply -->

- [ ] `feat` — new feature or API addition
- [ ] `fix` — bug fix
- [ ] `perf` — performance improvement (no API change)
- [ ] `refactor` — code restructuring (no behavior change)
- [ ] `docs` — documentation only
- [ ] `test` — test addition or fix
- [ ] `chore` / `ci` / `build` — tooling, CI, build changes

## Changes

<!-- Bullet list of what changed. Reference files/lines where useful. -->

-
-

## Test plan

<!-- How was this tested? What new tests were added? -->

- [ ] Added tests covering the new behavior
- [ ] Ran `npm run coverage` — 100% coverage maintained
- [ ] Manual verification: <!-- describe steps -->

## Bundle size impact

<!-- Run `npm run size` and paste the relevant rows, or write "No bundle impact". -->

## Breaking changes

<!-- List any breaking API changes and the migration path, or write "None". -->

---

## Pre-merge checklist

<!-- All boxes must be checked before merging. CI enforces most of these automatically. -->

- [ ] `npm run coverage` passes — 100% statements, branches, functions, lines
- [ ] `npm run typecheck` passes — zero TypeScript errors
- [ ] `npm run lint` passes — cognitive complexity ≤ 15 per function
- [ ] `node scripts/complexity.js` passes — max CC ≤ 10, MI ≥ 50
- [ ] `npm run size` within budget — core ≤ 3 KB, addons ≤ 6 KB, handlers ≤ 2 KB
- [ ] Commit messages follow Conventional Commits (`type(scope): subject`)
- [ ] Docs updated if API changed (`docs/api/`, `README.md`, `CONTRIBUTING.md`)
- [ ] `src/index.d.ts` updated if public API changed
