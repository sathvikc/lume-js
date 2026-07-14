# AGENTS.md — How to work on Lume.js

Process contract for AI agents and humans. Follow it for **every** change. (Most agent tooling, including Claude Code, picks this file up automatically.)

## What this library is

Standards-only reactivity: `data-*` attributes, plain JavaScript, no build step, no custom syntax. The product is **trust in a tiny core** — 1.46 KB universal kernel (`lume-js/state`), 2.66 KB with DOM (`lume-js`), everything else opt-in.

Two documents are the source of truth — read them **before** designing anything:

1. `docs/design/design-decisions.md` — ratified decisions (the contract). If your change contradicts an entry, the entry wins until it is amended.
2. `docs/design/VISION.md` — direction, roadmap, open problems.

## Hard constraints (never violate)

- **Standards-only.** No custom syntax beyond `data-*` attributes. No expressions in attributes (state-key/path references only). No build-step requirement for users.
- **Explicit over magic.** No hidden behavior, no auto-registration.
- **No import side effects.** `package.json` declares `"sideEffects": false` — module top-levels must be pure (no global mutation, no registration on import). This is what sank the old pluggable-scheduler branch.
- **Dependency directions.** `core/state.js` imports nothing upward (no DOM, no effect, no addons). Addons import core only. **No addon → addon imports.** Handlers import nothing (or `utils/log.js`).
- **Browser floor:** Chrome 80+, Firefox 74+, Safari 13.1+, Edge 80+ (ES2020: the source already uses `?.` and `??`, shipped un-transpiled). Nothing newer than ES2020 in `src/` — no `Object.hasOwn`, `.at()`, `??=`/`||=`/`&&=`, `structuredClone`, `replaceAll`. Check MDN before using any API newer than 2020, and update the README support table if the floor ever moves.
- **Source is plain JS + handwritten `.d.ts`.** When you change a public signature, update the matching `.d.ts` in the same commit.
- **Never bump the package version** unless explicitly asked.

## The artifact matrix — what each change type requires

| Change type | Tests | `.d.ts` | API docs (`docs/api/`) | CHANGELOG | Decision entry (`design-decisions.md`) | Example (`examples/`) | README |
|---|---|---|---|---|---|---|---|
| **New public API** (core/addon/handler) | ✅ | ✅ | ✅ new page + `docs/README.md` link | ✅ | ✅ **required** | ✅ if visually demonstrable | ✅ tables/links |
| **Behavior/semantics change** | ✅ | if signature moved | ✅ update | ✅ | ✅ **required** (new entry or amendment) | ❌ | if user-facing |
| **Bug fix** (restores already-documented behavior) | ✅ regression test | rarely | only if it described the bug | ✅ | ❌ — unless the fix reveals the decision itself was wrong | ❌ | ❌ |
| **Security hardening** | ✅ | rarely | ✅ `@security` notes | ✅ | ✅ short note (Hardening section) | ❌ | ❌ |
| **Refactor** (no observable change) | existing must pass | ❌ | ❌ | optional | ❌ | ❌ | ❌ |
| **Docs only** | ❌ | ❌ | — | optional | only when changing a decision | ❌ | — |
| **Build / CI / tooling** | if testable | ❌ | ❌ | if users notice | ❌ | ❌ | if size/badge story changes |

**The tiebreaker:** *could a user observe the difference?* If yes → CHANGELOG always, decision entry whenever the "why" isn't already ratified. If no → neither. Don't write decision entries for typo fixes; never skip one for new semantics.

Additional rules tied to specific artifacts:

- **Decision entries** are added only when truly necessary and meaningful — new semantics, a changed guarantee, a ratified tradeoff — not for every change; most commits need no entry. They follow house style: Decision / Reasoning / Alternatives considered / Tradeoff — the **why** is the point; an entry that states an outcome without the reasoning that led to it is incomplete. Amending an existing decision: add a dated amendment block, don't rewrite history.
- **Examples** get `examples/<slug>/index.html` + `main.js` (import from `'lume-js'` — the vite resolver maps it to `src/`) and a card in `examples/index.html`'s grid. Add one only for features whose behavior is better *seen* than read.
- **Proposal branches** (multi-commit feature branches for review): every commit also gets a row in `docs/changes/README.md`, and feat/fix commits get a full write-up file there (what/why, before/after examples, edge cases, how to verify). Plain main-line fixes don't need this.

## Quality gates — all must pass before every commit

```bash
npx vitest run --coverage   # ALL tests pass; coverage 100/100/100/100 (hard gate)
npm run lint                # eslint incl. sonarjs cognitive-complexity ≤ 15
node scripts/complexity.js  # per-function CC ≤ 10, per-file MI ≥ 50
npm run size                # build + per-entry gzip budgets (table below)
npm run typecheck           # tsc --noEmit against handwritten .d.ts
```

| dist entry | Budget (gz) | Note |
|---|---|---|
| `state.min.mjs` | ≤ 1.75 KB | universal kernel — guard this jealously |
| `index.min.mjs` | ≤ 3 KB | full core |
| `handlers.min.mjs` | ≤ 2 KB | |
| `addons.min.mjs` | ≤ 6 KB | |
| `lume.global.js` | ≤ 8 KB | IIFE all-in-one |

- 100% coverage is enforced — write the tests *with* the feature, not after. `/* v8 ignore */` is allowed only for genuinely unreachable guards, with a justification in the comment (see existing uses in `effect.js`).
- If a complexity gate fails, **extract a module** (see `core/batch.js`'s extraction history) rather than suppressing the rule.
- If an entry's size changes by ≥ 0.05 KB, update the README badges and any size claims in docs (`README.md` header, `docs/guides/universal-core.md`, comparison tables).

## Commits

- Conventional commits: `fix(core):`, `feat(addons):`, `docs(design):`, `refactor(core):`, `chore:` …
- **One logical change per commit**, carrying all its artifacts from the matrix (code + tests + types + docs + changelog together — a commit should be revertable as a unit).
- Body explains *why* and lists what's covered; no AI model names or tool signatures in commit messages or code.

## Branch workflow

- `main` is curated. Experiments live on branches; many die — that's the system working.
- A change is **done** when: matrix artifacts complete → all five gates green → decision entry ratified (when required) → commit message tells the story.
- Don't create PRs, push to other branches, or touch `gh-pages` unless asked.

## Where truth lives (avoid doc drift)

| Document | Owns | Update when |
|---|---|---|
| `docs/design/design-decisions.md` | **why** (ratified) | any decision is made/amended — same commit |
| `docs/design/VISION.md` | direction, open problems | roadmap items ship (mark ✅) or strategy shifts; dated notes log |
| `docs/api/**` | reference semantics | the API they describe changes |
| `docs/guides/**` | how-to | workflows change |
| `README.md` | the pitch + numbers | features, sizes, test counts change |
| `CHANGELOG.md` | what changed, per release | every user-observable change (under `[Unreleased]`) |
| `docs/changes/**` | per-branch review write-ups | proposal-branch commits |
| `AGENT_GUIDE.md` | how *consumers'* agents use Lume (rules, pitfalls, patterns) | public API or best practices change |
| `llms.txt` / `llms-full.txt` | generated agent doc bundle — **never hand-edit** | run `npm run llms` after touching README, `AGENT_GUIDE.md`, or `docs/**` (CI job `agent-docs` fails on drift) |

When you finish any task, scan this table once: "did I change something a row owns?" Stale docs are treated as bugs in this repo.
