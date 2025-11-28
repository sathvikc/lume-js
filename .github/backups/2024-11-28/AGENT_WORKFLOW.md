# Agent Development Workflow

**RULE: FAIL-FAST. First violation = STOP immediately.**

---

## ✓ Phase 0: Git Safety (ALWAYS FIRST)

**NEVER make changes directly to main branch.**

- [ ] Check current branch: `git branch --show-current`
- [ ] If on `main`, create feature branch: `git checkout -b ai/[feature-name]`
- [ ] Branch naming:
  - Features: `ai/feature-[brief-description]`
  - Fixes: `ai/fix-[issue-description]`
  - Docs: `ai/docs-[what-updated]`
  - Tests: `ai/test-[what-tested]`
  - Content: `ai/content-[article-topic]`
  - Audit: `ai/audit-[date]`
- [ ] Verify: `git branch --show-current` shows your branch, NOT main

**Example:**
```bash
git checkout -b ai/feature-new-computed-api
# or
git checkout -b ai/fix-memory-leak
# or
git checkout -b ai/content-reactivity-explained
```

---

## ✓ Phase 1: Implementation
- [ ] Read existing code in relevant files
- [ ] Implement feature in `src/`
- [ ] Run `npm test` → Must pass or FIX NOW
- [ ] Run `npm run size` → Must be <2KB or REFACTOR NOW

## ✓ Phase 2: Testing
- [ ] Add test file in `tests/` matching source structure
- [ ] Write tests: happy path + edge cases + errors
- [ ] Achieve 100% coverage for new code
- [ ] Run `npm test` → Must pass
- [ ] Run `npm run coverage` → Must be 100%

## ✓ Phase 3: Type Definitions
- [ ] Update `.d.ts` file matching source
- [ ] Add JSDoc to all functions
- [ ] Export new types if applicable
- [ ] Verify no TypeScript errors in examples

## ✓ Phase 4: Documentation
- [ ] Design decision? Update `docs/design/design-decisions.md`
    - Format: `## [Date] Feature Name`
    - Include: Why chosen, alternatives rejected, tradeoffs
- [ ] API changed? Update `README.md` examples
- [ ] Behavior changed? Update `docs/README.md`

## ✓ Phase 5: Examples
- [ ] Check if changes break existing examples
- [ ] Breaks? FIX before proceeding
- [ ] New feature? Consider adding example
- [ ] Test affected examples in browser: `npm run dev`

## ✓ Phase 6: Validation
- [ ] Run `npm test` → MUST PASS
- [ ] Run `npm run size` → MUST BE <2KB
- [ ] Issues? FIX before commi

## ✓ Phase 7: Commit (On Feature Branch)
- [ ] Verify you're on feature branch: `git branch --show-current`
- [ ] Review all changes: `git diff`
- [ ] Stage changes: `git add -A`
- [ ] Commit: `git commit -m "type(scope): description"`
- [ ] Types: feat, fix, docs, test, refactor, chore
- [ ] Breaking change? Add `BREAKING CHANGE:` in body
- [ ] Push to remote: `git push origin [branch-name]`

**DO NOT merge to main yet. Human will review branch first.**

## ✓ Phase 8: Verify
- [ ] Run `npm test` again
- [ ] Check examples: `npm run dev`
- [ ] Broken? Fix and amend commi

## ✓ Phase 9: Human Review & Merge
- [ ] **AI:** Share branch name with human for review
- [ ] **AI:** List all changes made
- [ ] **AI:** Wait for human approval
- [ ] **HUMAN reviews and decides:**
  - Approve? Human merges to main
  - Changes needed? AI makes updates on branch
  - Reject? Delete branch

**AI NEVER merges to main. Human always does final merge.**

---

## VIOLATION PROTOCOLS

**Bundle >2KB:**
- STOP immediately
- Refactor to reduce size
- Document tradeoff in design-decisions.md
- Get human approval if can't reduce

**Broken Tests/Examples:**
- STOP immediately
- Fix before ANY other work
- Breaking change? Document + get approval
