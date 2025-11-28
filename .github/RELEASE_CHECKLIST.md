# Release Checklis

Follow this checklist for every release.

---

## Pre-Release (1 week before)

- [ ] All tests passing
- [ ] Bundle size < 2KB gzipped
- [ ] 100% test coverage
- [ ] All examples working
- [ ] Documentation up to date
- [ ] No open critical bugs
- [ ] CHANGELOG.md updated
- [ ] Breaking changes documented (if any)

---

## Versioning

Determine version number using [Semantic Versioning](https://semver.org/):

- **Patch (0.5.X)** - Bug fixes only
- **Minor (0.X.0)** - New features (backwards compatible)
- **Major (X.0.0)** - Breaking changes

**Example:**
- Bug fix: `0.5.0` → `0.5.1`
- New feature: `0.5.0` → `0.6.0`
- Breaking change: `0.5.0` → `1.0.0`

---

## Release Steps

### 1. Update Version

```bash
# Checkout main and pull lates
git checkout main
git pull --rebase origin main

# Create release branch
git checkout -b release/vX.X.X

# Update package.json version
npm version [patch|minor|major] --no-git-tag-version

# Example for patch:
npm version patch --no-git-tag-version
```

### 2. Update CHANGELOG.md

```markdown
## [X.X.X] - YYYY-MM-DD

### Added
- List new features

### Changed
- List changes to existing features

### Fixed
- List bug fixes

### Breaking Changes (if major version)
- List breaking changes
- Include migration guide
```

### 3. Final Checks

```bash
# Install fresh dependencies
rm -rf node_modules package-lock.json
npm install

# Run full test suite
npm tes

# Check coverage
npm run coverage

# Verify bundle size
npm run size

# Test examples
npm run dev
# Manually test each example in browser

# Build (if applicable)
npm run build
```

### 4. Commit Release

```bash
git add package.json package-lock.json CHANGELOG.md
git commit -m "chore(release): v X.X.X"
git push origin release/vX.X.X
```

### 5. Create PR

- Create PR: `release/vX.X.X` → `main`
- Title: `Release vX.X.X`
- Description: Copy changelog entry
- Wait for CI to pass
- Get human approval

### 6. Merge to Main

```bash
# Human merges PR
# Then pull latest main
git checkout main
git pull --rebase origin main
```

### 7. Create Git Tag

```bash
# Create annotated tag
git tag -a vX.X.X -m "Release vX.X.X"

# Push tag (triggers release workflow)
git push origin vX.X.X
```

### 8. GitHub Actions Publishes

The tag push triggers `.github/workflows/release.yml` which:
- ✅ Runs tests
- ✅ Checks bundle size
- ✅ Publishes to npm
- ✅ Creates GitHub Release

Monitor the workflow at:
`https://github.com/sathvikc/lume-js/actions`

### 9. Verify Release

```bash
# Check npm
npm view lume-js version
# Should show new version

# Check GitHub Releases
# https://github.com/sathvikc/lume-js/releases
# Should show new release

# Test installation
mkdir test-install
cd test-install
npm init -y
npm install lume-js
# Should install new version
```

---

## Post-Release

- [ ] Announce on Twitter/X
- [ ] Post on Reddit (r/javascript, r/webdev)
- [ ] Update LinkedIn
- [ ] Write blog post (if major/minor)
- [ ] Update documentation site (if applicable)
- [ ] Close milestone (if using milestones)
- [ ] Thank contributors

---

## If Something Goes Wrong

### If npm publish fails:

```bash
# Manual publish (needs NPM_TOKEN)
npm login
npm publish --access public

# Or wait and retry
# npm has rate limits
```

### If wrong version published:

```bash
# Deprecate wrong version
npm deprecate lume-js@X.X.X "Accidental publish, use vX.X.Y instead"

# Publish correct version
npm version patch
npm publish
```

### If major bug found after release:

```bash
# Hot fix process
git checkout main
git pull --rebase origin main
git checkout -b hotfix/vX.X.Y

# Fix bug
# ...

# Follow release process for patch version
npm version patch
# ... rest of release steps
```

---

## Release Schedule

**Patch releases:** As needed (bug fixes)
**Minor releases:** Monthly (new features)
**Major releases:** When breaking changes necessary (rare)

---

## Template: Release Announcemen

### Twitter/X
```
🎉 Lume.js vX.X.X is out!

✨ What's new:
• [Feature 1]
• [Feature 2]
• [Bug fix]

Still just 1.4KB gzipped 📦
100% test coverage ✅

Get it: npm install lume-js

Changelog: [link]
```

### Reddi
```
Title: Lume.js vX.X.X - [Key highlight]

Hey everyone! Just released vX.X.X of lume-js.

What's new:
- [Feature details]
- [Feature details]
- [Fix details]

Lume-js is a tiny (1.4KB) reactive library with zero dependencies.

Check it out: github.com/sathvikc/lume-js
npm: npm install lume-js

Let me know what you think!
```

---

## Checklist Summary

Before release:
- [ ] Tests pass
- [ ] Size < 2KB
- [ ] Coverage 100%
- [ ] Examples work
- [ ] Docs curren
- [ ] CHANGELOG updated

During release:
- [ ] Version bumped
- [ ] Tag created
- [ ] PR merged
- [ ] CI published
- [ ] Verified on npm

After release:
- [ ] Announced publicly
- [ ] Documentation updated
- [ ] Celebration! 🎉
