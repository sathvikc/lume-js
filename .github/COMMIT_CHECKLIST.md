# Commit Checklist

Run through this before every commit. CI catches most of these, but catching them locally is faster.

> The full process contract (artifact matrix — which change types require tests/types/docs/changelog entries) lives in [`AGENTS.md`](../AGENTS.md). This checklist is the mechanical pre-commit pass; AGENTS.md decides *what* a complete commit contains.

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
# Runs: build → size check → complexity → lint → typecheck → coverage → llms freshness check
```

Or step by step:

```bash
npm run build                  # produces dist/
npm run size                   # all bundles within budget
node scripts/complexity.js     # max CC ≤ 10, MI ≥ 50
npm run lint                   # sonarjs/cognitive-complexity
npm run typecheck              # tsc --noEmit
npm run coverage               # vitest --coverage (100% required)
npm run llms:check             # llms.txt / llms-full.txt match the docs tree
```

Touched `README.md`, `AGENT_GUIDE.md`, `package.json` (version), or anything under `docs/`? Run `npm run llms` and commit the regenerated `llms.txt` / `llms-full.txt` in the same commit — the CI `agent-docs` job fails the PR on drift.

---

## Commit message format

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
type(scope): short description

Optional body explaining WHY (not what — the diff shows what).

Optional footer: BREAKING CHANGE: ..., Closes #123
```

Body rules:

- Never hard-wrap the body at a fixed column — one paragraph or list item per line, however long (same rule as all repo prose; see CLAUDE.md).
- No AI model names or tool signatures in commit messages (see AGENTS.md) — commits are authored by the human who ships them.

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
- **New public API** — the matching handwritten `.d.ts` updated in the same commit? (`src/state.d.ts` is the kernel source of truth; `src/index.d.ts` re-exports it; addons/handlers have their own `index.d.ts`.)
- **New handler or addon** — exported from barrel (`src/handlers/index.js` or `src/addons/index.js`)?
- **Docs / README / AGENT_GUIDE touched** — `npm run llms` re-run and bundles committed?
- **Complex function** — cognitive complexity ≤ 15? If not, can you simplify? If intentional, add inline disable comment with justification.
- **Large function** — cyclomatic CC ≤ 10? If pre-existing exception needed, add to `KNOWN_EXCEPTIONS` in `scripts/complexity.js`.
- **Size-sensitive change** — run `npm run size` and check the budget bars.
