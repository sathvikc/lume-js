# Lume.js vX.Y.Z — YYYY-MM-DD

<!-- 1–3 sentence headline. What's the story of this release? -->

---

## Highlights

<!-- The 1–3 most important things a user needs to know. -->

---

## New Features

<!-- One bullet per new API, addon, or handler. Link to docs where useful. -->

-

---

## Bug Fixes

<!-- One bullet per fix. Reference the issue number if one exists. -->

-

---

## Performance

<!-- Only include if there's a measurable or architectural improvement. -->

-

---

## Breaking Changes

<!-- Empty table = no breaking changes. Always include migration path. -->

| Change | Migration |
|--------|-----------|
| — | — |

---

## Deprecations

<!-- APIs that still work but will be removed in a future major. -->

-

---

## Tests

<!-- Test count and any notable new coverage areas. -->

**X tests passing** (from Y in vPREV)

---

## Bundle Sizes

<!-- Paste from `npm run size` output. -->

| Entry point | Gzipped | Budget |
|------------|---------|--------|
| `dist/index.mjs` (core) | X.XX KB | 3 KB |
| `dist/addons.mjs` | X.XX KB | 6 KB |
| `dist/handlers.mjs` | X.XX KB | 2 KB |
| `dist/lume.global.js` (CDN) | X.XX KB | 8 KB |

---

## Install

```bash
npm install lume-js@X.Y.Z
```

**CDN:**

```html
<script type="module">
  import { state, bindDom, effect } from 'https://cdn.jsdelivr.net/npm/lume-js@X.Y.Z/dist/index.mjs';
</script>
```

**Global (no-module CDN):**

```html
<script src="https://cdn.jsdelivr.net/npm/lume-js@X.Y.Z/dist/lume.global.js"></script>
```

---

## Full Changelog

[CHANGELOG.md · vX.Y.Z](https://github.com/sathvikc/lume-js/blob/main/CHANGELOG.md#xyz---yyyy-mm-dd)

**Compare:** https://github.com/sathvikc/lume-js/compare/vPREV...vX.Y.Z

---

<!-- Delete unused sections before publishing. -->
