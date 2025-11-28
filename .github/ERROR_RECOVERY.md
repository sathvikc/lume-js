# Error Recovery Protocols

What AI should do when things go wrong.

---

## Test Failures

### When `npm test` fails:

**1. Identify the failure**
```bash
# Run tests with verbose outpu
npm test -- --reporter=verbose

# Check which test failed
# Read error message carefully
```

**2. Fix on current branch**
```bash
# Make fix
# Re-run tests
npm tes

# If still failing, try:
npm run test:watch  # Interactive mode
```

**3. If can't fix immediately**
- [ ] Comment in PR: "Tests failing, investigating..."
- [ ] Create issue with error details
- [ ] Mark PR as draf
- [ ] Ask human for help if stuck >30min

### When tests are flaky:
- Run 3 times to confirm
- If still flaky → it's a real issue
- Add test stabilization
- Never merge flaky tests

---

## Bundle Size Exceeded

### When `npm run size` shows >2KB:

**STOP IMMEDIATELY. Do NOT proceed.**

**1. Analyze what grew**
```bash
# Check what changed
git diff main -- src/

# Look for:
- New imports
- Duplicate code
- Unnecessary functions
```

**2. Refactor to reduce**
- Remove unused code
- Combine duplicate logic
- Use shorter variable names (if significant)
- Simplify conditionals

**3. Document if unavoidable**
- Update `docs/design/design-decisions.md`
- Explain why size increase is necessary
- Get human approval before proceeding

**4. Never merge if >2KB**
- This is a hard limi
- No exceptions

---

## Build Failures

### When `npm run build` fails:

**1. Check node version**
```bash
node --version
# Should be >= 20.19.0
```

**2. Clear caches**
```bash
rm -rf node_modules package-lock.json
npm install
npm run build
```

**3. Check for syntax errors**
- Review recent changes
- Look for unclosed brackets, quotes
- Check imports/exports

---

## Git Conflicts

### When rebasing causes conflicts:

**1. Don't panic**
```bash
# See what's conflicting
git status

# For each conflict:
# 1. Open file
# 2. Choose correct version
# 3. Remove conflict markers (<<<<, ====, >>>>)
git add [file]
```

**2. Continue rebase**
```bash
git rebase --continue
```

**3. If too complex**
```bash
# Abort and ask for help
git rebase --abor
# Create issue explaining the conflic
```

---

## CI/CD Failures

### When GitHub Actions fail:

**1. Check the logs**
- Click on failed job
- Read error message
- Identify which step failed

**2. Reproduce locally**
```bash
# Run the same commands that failed
npm ci
npm tes
npm run size
```

**3. Fix and push**
```bash
# Make fix
git add -A
git commit -m "fix(ci): resolve [issue]"
git push origin [branch-name]
# CI will re-run automatically
```

---

## Breaking Changes

### When change breaks examples:

**STOP. Do NOT merge.**

**1. Fix the examples**
```bash
cd examples/[broken-example]
# Update code to work with changes
# Test in browser: npm run dev
```

**2. Update documentation**
```bash
# Update README.md
# Update docs/
# Add migration guide if major change
```

**3. Mark as breaking**
```bash
# In commit message:
git commit -m "feat(core)!: breaking change description

BREAKING CHANGE: Explain what broke and how to migrate"
```

**4. Get human approval**
- Breaking changes ALWAYS need human review
- Document in CHANGELOG.md
- Consider if worth i

---

## Dependency Issues

### When `npm install` fails:

**1. Check package-lock.json**
```bash
# Remove and regenerate
rm package-lock.json
npm install
```

**2. Check for conflicts**
- Read error message
- Look for version conflicts
- Update package.json if needed

**3. Check node version**
```bash
# Must be >= 20.19.0
node --version
```

---

## Performance Regressions

### When benchmarks are slower:

**1. Run benchmarks multiple times**
```bash
# Variance is normal
npm run benchmarks
npm run benchmarks
npm run benchmarks
# Average the results
```

**2. If consistently slower:**
- Identify which benchmark
- Check recent changes
- Profile the code
- Optimize or rever

**3. Document if unavoidable**
- Explain tradeoff
- Update docs
- Get human approval

---

## Rollback Procedures

### When everything is broken:

**1. Revert the commit**
```bash
git revert [commit-hash]
git push origin [branch-name]
```

**2. Or delete branch and start over**
```bash
git checkout main
git pull --rebase origin main
git branch -D [broken-branch]
git checkout -b [new-branch]
# Start fresh
```

**3. Learn from it**
- Document what went wrong
- Add tests to prevent recurrence
- Update ERROR_RECOVERY.md if new pattern

---

## When to Ask Human for Help

Ask immediately if:
- [ ] Tests failing for >30 minutes
- [ ] Bundle size can't get under 2KB
- [ ] Breaking change seems necessary
- [ ] Security vulnerability found
- [ ] Can't understand error message
- [ ] Git history is corrupted
- [ ] Multiple systems failing simultaneously

**How to ask:**
```bash
@human I'm stuck on [issue].

What I tried:
1. [Thing I tried]
2. [Thing I tried]

Error message:
[paste error]

Need guidance on:
- [Specific question]
```

---

## Prevention

**Before every commit:**
- [ ] Run `npm test`
- [ ] Run `npm run size`
- [ ] Test examples manually
- [ ] Read your own code changes
- [ ] Check git diff for unintended changes

**Before every push:**
- [ ] Rebase with main
- [ ] Re-run tests
- [ ] Check CI will pass

**Never:**
- ❌ Merge failing tests
- ❌ Merge >2KB bundle
- ❌ Skip workflow phases
- ❌ Force push to main
- ❌ Commit without testing
