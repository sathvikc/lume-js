# Release Checklist

Use this for every npm publish — patch, minor, or major. Work top to bottom; don't skip steps.

---

## 1. Pre-release — branch and CI

- [ ] All CI checks green on the release branch (tests, typecheck, lint, complexity, size)
- [ ] No uncommitted changes: `git status`
- [ ] Branch is up to date with `main`: `git fetch && git status`

---

## 2. Version bump

Decide the version bump following [SemVer](https://semver.org/):

| Change | Version |
|--------|---------|
| Breaking API change, removed feature | MAJOR (`X.0.0`) |
| New feature, new addon/handler (backward-compatible) | MINOR (`0.X.0`) |
| Bug fix, performance fix, docs (no API change) | PATCH (`0.0.X`) |

```bash
# In package.json — bump "version" manually, or:
npm version patch   # 2.1.0 → 2.1.1
npm version minor   # 2.1.0 → 2.2.0
npm version major   # 2.1.0 → 3.0.0
```

> `npm version` creates a commit and tag automatically. If you prefer manual control, edit `package.json` directly and create the tag in step 7.

---

## 3. CHANGELOG.md

- [ ] Add a new section at the top of `CHANGELOG.md`:

```markdown
## [X.Y.Z] - YYYY-MM-DD

### Added
- ...

### Fixed
- ...

### Performance
- ...

### Breaking Changes
- ...

### Tests
- X tests passing (from Y) | N new tests

### Documentation
- ...
```

Use `git log --oneline vPREV..HEAD` to enumerate commits since last release.

---

## 4. Update README badges

In `README.md`:

- [ ] `> **Current Release:** vX.Y.Z` — bump version
- [ ] `[![Version](https://img.shields.io/badge/version-X.Y.Z-orange.svg)]` — bump version
- [ ] `[![Tests](https://img.shields.io/badge/tests-NNN%20passing-brightgreen.svg)]` — update test count
- [ ] `> Bundle size: ~X.XXKB gzipped` — update from `npm run size` output
- [ ] `[![Size](https://img.shields.io/badge/core-X.XXKB-blue.svg)]` — update core size

Run `npm run size` to get the current gzipped sizes.

---

## 5. Build and validate

```bash
npm run validate
# Runs: build → size check → complexity → lint → typecheck → coverage
```

All steps must pass. If coverage drops from 100%, add tests before proceeding.

---

## 6. Commit release changes

```bash
git add package.json CHANGELOG.md README.md
git commit -m "chore(release): prepare vX.Y.Z"
```

---

## 7. Tag the release

```bash
git tag vX.Y.Z
git push origin main --tags
```

> If you used `npm version`, the tag is already created — just push it.

---

## 8. Publish to npm

```bash
# Dry run first to verify what gets published
npm publish --dry-run

# Publish
npm publish
```

The `prepublishOnly` hook runs `npm run validate` automatically. If it fails, fix and re-run.

---

## 9. GitHub Release

- [ ] Go to GitHub → Releases → Draft a new release
- [ ] Tag: `vX.Y.Z` (the tag you just pushed)
- [ ] Title: `Lume.js vX.Y.Z`
- [ ] Body: use `.github/RELEASE_TEMPLATE.md` as a starting point
- [ ] Publish release

---

## 10. Verify CDN propagation

Wait ~5 minutes, then confirm:

- [ ] `https://cdn.jsdelivr.net/npm/lume-js@X.Y.Z/dist/index.mjs` resolves
- [ ] `https://unpkg.com/lume-js@X.Y.Z/dist/lume.global.js` resolves
- [ ] `https://cdn.jsdelivr.net/npm/lume-js@X.Y.Z/dist/addons.mjs` resolves

---

## 11. gh-pages site

The gh-pages site deploys automatically on push to `main` via `.github/workflows/gh-pages.yml`. Verify it picks up the new version:

- [ ] Check the Actions tab — `Deploy GitHub Pages` workflow completed
- [ ] Spot-check `https://sathvikc.github.io/lume-js/` — version number correct

---

## 12. Framework benchmarks (if applicable)

If this release affects observable performance, bundle size, or public API:

1. Publish to npm first and wait for CDN
2. Update the benchmark app's `lume-js` import to `@X.Y.Z`
3. Re-run the full benchmark suite
4. Update `summary.json` and `frameworks.json`
5. Commit: `chore(bench): update Lume.js to vX.Y.Z`

---

## Post-release

- [ ] Announce in relevant channels if a notable release
- [ ] Update any open issues that were resolved by this release
- [ ] If there are pre-release tags (`alpha`, `beta`, `rc`) on npm, deprecate them: `npm deprecate lume-js@X.Y.Z-beta.1 "Use vX.Y.Z"`
