# Git Workflow for AI Agents

**Main branch is sacred. Never touch it directly.**

## Quick Reference

```bash
# Start ANY work - always rebase pull latest firs
git checkout main
git pull --rebase origin main
git checkout -b ai/[type]-[description]

# Make changes, test, commi
git add -A
git commit -m "type(scope): description"

# Push for human review
git push origin [branch-name]

# Human reviews and merges to main
```

## Branch Naming Convention

Format: `ai/[type]-[brief-description]`

### Types

**`ai/feature-*`** - New features
```bash
git checkout -b ai/feature-server-side-rendering
git checkout -b ai/feature-computed-setters
```

**`ai/fix-*`** - Bug fixes
```bash
git checkout -b ai/fix-memory-leak-effects
git checkout -b ai/fix-repeat-key-issues
```

**`ai/docs-*`** - Documentation updates
```bash
git checkout -b ai/docs-api-improvements
git checkout -b ai/docs-tutorial-updates
```

**`ai/test-*`** - Test additions/improvements
```bash
git checkout -b ai/test-coverage-sprin
git checkout -b ai/test-edge-cases
```

**`ai/refactor-*`** - Code refactoring
```bash
git checkout -b ai/refactor-effect-batching
git checkout -b ai/refactor-reduce-bundle-size
```

**`ai/content-*`** - Marketing conten
```bash
git checkout -b ai/content-reactivity-deep-dive
git checkout -b ai/content-social-media-week-12
```

**`ai/audit-*`** - Audit work
```bash
git checkout -b ai/audit-2024-11-28
git checkout -b ai/audit-benchmark-results
```

## Workflow Steps

### 1. Before Starting Work

```bash
# Switch to main branch
git checkout main

# Pull latest changes using rebase (keeps history clean)
git pull --rebase origin main

# Create feature branch from updated main
git checkout -b ai/[type]-[description]

# Verify you're on new branch
git branch --show-curren
# Should output: ai/[type]-[description], NOT main
```

**Why rebase?** Keeps commit history linear and clean by avoiding merge commits. Your branch will have latest changes without messy merge history.

### 2. During Work

```bash
# Make changes
# Run tests: npm tes
# Check size: npm run size

# Check what changed
git status
git diff

# Stage all changes
git add -A

# Commit with conventional forma
git commit -m "feat(core): add computed setters"
# or
git commit -m "fix(repeat): resolve memory leak on unmount"
# or
git commit -m "docs(readme): update installation instructions"
```

### 3. After Work Complete

```bash
# Push branch to remote
git push origin [branch-name]

# Example:
git push origin ai/feature-computed-setters
```

### 4. Human Review

AI should report:
```
✅ Work complete on branch: ai/feature-computed-setters

Changes:
- Added computed setters API
- Added tests (100% coverage)
- Updated docs
- Bundle size: 1.45KB (under 2KB ✓)

Ready for review and merge to main.
```

Human then:
- Reviews branch
- Tests locally if needed
- Merges to main OR requests changes

## Multiple Commits on Same Branch

If you need to make updates after first commit:

```bash
# Make changes
git add -A
git commit -m "fix(computed): handle edge case"
git push origin [branch-name]
```

Branch accumulates commits until human merges to main.

## What If You Accidentally Work on Main?

**STOP IMMEDIATELY**

```bash
# Stash your changes
git stash

# Create branch
git checkout -b ai/[type]-[description]

# Apply changes to new branch
git stash pop

# Continue work on branch
```

## Never Do These

❌ `git checkout main` (while working)
❌ `git merge [branch] main`
❌ `git push origin main`
❌ Direct commits to main

## Always Do These

✅ Start work: `git checkout -b ai/[type]-[description]`
✅ Verify branch: `git branch --show-current`
✅ Push branch: `git push origin [branch-name]`
✅ Wait for human to merge

## Branch Cleanup (Human Does This)

After merge, human will delete the branch:
```bash
git branch -d ai/feature-computed-setters
git push origin --delete ai/feature-computed-setters
```

AI doesn't need to worry about this.

## Emergency: Abort Everything

If something goes wrong:

```bash
# Abandon all changes and go back to main
git checkout main
git reset --hard origin/main

# Start fresh
git checkout -b ai/[type]-[description]
```

## Summary

1. **Create branch** before ANY changes
2. **Work on branch** (commit, push)
3. **Push branch** for review
4. **Human merges** to main

Main branch stays clean. Every change is reviewable. Nothing breaks production.
