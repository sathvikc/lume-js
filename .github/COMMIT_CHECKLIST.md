# Commit Checklist

Run through this before every commit. CI catches most of these, but catching them locally is faster.

---

## Quick check (every commit)

```bash
npm run coverage     # tests + 100% coverage
npm run typecheck    # zero TS errors
npm run lint         # cognitive complexity ≤ 15
```

## Full check (before pushing / opening a PR)

```bash
npm run validate
# Runs: build → size check → complexity → lint → typecheck → coverage
```

Or step by step:

```bash
npm run build                  # produces dist/
npm run size                   # all bundles within budget
node scripts/complexity.js     # max CC ≤ 10, MI ≥ 50
npm run lint                   # sonarjs/cognitive-complexity
npm run typecheck              # tsc --noEmit
npm run coverage               # vitest --coverage (100% required)
```

---

## Commit message format

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
type(scope): short description

Optional body explaining WHY (not what — the diff shows what).

Optional footer: BREAKING CHANGE: ..., Closes #123
```

### Types

| Type | Use for |
|------|---------|
| `feat` | New feature or API addition |
| `fix` | Bug fix |
| `perf` | Performance improvement, no API change |
| `refactor` | Restructuring, no behavior change |
| `docs` | Documentation only |
| `test` | Adding or fixing tests |
| `chore` | Tooling, deps, build config |
| `ci` | CI/CD workflow changes |
| `build` | Build system changes |

### Scopes

| Scope | Covers |
|-------|--------|
| `core` | `src/core/` — state, effect, bindDom |
| `addons` | `src/addons/` — computed, watch, repeat, debug |
| `handlers` | `src/handlers/` — show, classToggle, boolAttr, etc. |
| `docs` | `docs/` or `gh-pages/` content |
| `ci` | `.github/workflows/` |
| `bench` | `scripts/bench-*.js` or framework-benchmarks |
| `gh-pages` | `gh-pages/` site code |
| `readme` | `README.md` only |

### Examples

```
feat(addons): add { immediate } option to watch()
fix(core): prevent infinite loop on self-referencing effect
perf(repeat): eliminate per-update Set allocations in updateList
docs(handlers): document boolAttr and ariaAttr in guide
test(core): cover MAX_ITERATIONS flush guard
ci: add cognitive complexity gate via eslint-plugin-sonarjs
```

---

## Pre-commit: what to look for

- **New source code** — has tests? coverage still 100%?
- **New public API** — `src/index.d.ts` updated?
- **New handler or addon** — exported from barrel (`src/handlers/index.js` or `src/addons/index.js`)?
- **Complex function** — cognitive complexity ≤ 15? If not, can you simplify? If intentional, add inline disable comment with justification.
- **Large function** — cyclomatic CC ≤ 10? If pre-existing exception needed, add to `KNOWN_EXCEPTIONS` in `scripts/complexity.js`.
- **Size-sensitive change** — run `npm run size` and check the budget bars.
