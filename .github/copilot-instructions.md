# Lume.js Copilot Instructions

## Core Principles
`data-*` attributes only • No VDOM • <2KB gzipped • Zero dependencies • ES6+ only

## Git Safety Rules 🚨
**NEVER commit directly to main branch**
- Pull latest: `git checkout main && git pull --rebase origin main`
- Create branch: `git checkout -b ai/[feature-name]`
- Naming: `ai/feature-*`, `ai/fix-*`, `ai/docs-*`, `ai/test-*`, `ai/content-*`, `ai/audit-*`
- Push branch for human review
- Human merges to main, NOT AI

## Architecture
- `core/state.js` - Proxy reactivity
- `core/bindDom.js` - DOM binding
- `addons/` - Optional extensions
- JSDoc all functions • Export types from `.d.ts`

## Workflow (see AGENT_WORKFLOW.md for details)
0. **Phase 0: Git Safety** - Create branch (NEVER work on main)
1. Implement in `src/`
2. Test in `tests/` (100% coverage)
3. Update `.d.ts` types
4. Update `examples/` if relevan
5. Update `docs/design/design-decisions.md` for notable choices
6. Update `README.md` if API changes
7. **MUST PASS:** `npm test && npm run size`
8. Commit on branch: `type(scope): description`
9. Push branch, wait for human review & merge

## RUTHLESS ENFORCEMENT
- **Bundle >2KB** = FAIL, revert immediately
- **Broken tests** = BLOCK commit, fix firs
- **Skipped workflow steps** = REJECT, start over
- **Missing docs** = INCOMPLETE, not done until documented
- **Broken examples** = CRITICAL, fix before ANY other work

## Code Style
Clear names • Functional • Explicit • Single responsibility • No magic

## REJECT These
Custom syntax • Build requirements • Framework features • Routing/components/templates • Anything users can implement themselves

## Decision Protocol
- Feature >200 bytes? Justify or rejec
- Breaks example? Fix before proceeding
- Changes behavior? Update design-decisions.md
- Ask: "Can users solve this themselves?"

## Copilot Pro Hints
- Use `@workspace` for full contex
- Request test generation: "Generate tests for X"
- Symbol search available across entire workspace
- Leverage JSDoc for better suggestions
