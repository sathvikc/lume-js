# Migrating from 1.x

Lume 2.0 is a near-complete rewrite. The internals are faster and the architecture is cleaner — but the core API is fully backward compatible, so migrating is straightforward.

## Breaking changes

The only required change is bumping the version in `package.json`:

```diff
   "dependencies": {
-    "lume-js": "^1.0.0"
+    "lume-js": "^2.0.0"
   }
```

Everything else continues to work without modification.

## New in 2.x

- `watch(store, key, fn)` — explicit single-key watcher; callback receives `(newValue)` and fires immediately on subscribe
- `computed()` with `.dispose()` method
- `data-show` attribute (via `show` handler) — conditional visibility, positive counterpart to `data-hidden`
- `data-class-*` attributes (via `classToggle()` factory) — per-class CSS toggle (e.g. `data-class-active`)
- `show` handler — import from `lume-js/handlers`, pass to `bindDom` via the `handlers` option
- `classToggle()` handler factory — import from `lume-js/handlers`
- `stringAttr` handler

## Unchanged

- `state(obj)` — same API, smarter internals
- `bindDom(root, store, { handlers })` — same API
- `data-bind` attribute name

---

**← Previous: [Build Tic-Tac-Toe](../tutorials/build-tic-tac-toe.md)** | **Next: [Changelog](../../CHANGELOG.md) →**
