# Migrating from 1.x to 2.x

Lume 2.0 is a near-complete rewrite. The internals are faster and the architecture is cleaner — but the core API is fully backward compatible, so migrating is straightforward.

## Breaking changes

**Bump the version in `package.json`:**

```diff
   "dependencies": {
-    "lume-js": "^1.0.0"
+    "lume-js": "^2.0.0"
   }
```

**`isReactive` moved to `lume-js/addons`:**

```diff
- import { state, isReactive } from 'lume-js';
+ import { state } from 'lume-js';
+ import { isReactive } from 'lume-js/addons';
```

Everything else continues to work without modification.

## New in 2.x

- `watch(store, key, fn)` — explicit single-key watcher; fires immediately on subscribe with the current value
- `computed()` — derived value with auto-tracking and `.dispose()`
- `effect()` — reactive side-effect with optional explicit deps
- `isReactive()` — detect a reactive proxy (import from `lume-js/addons`)
- `data-show` attribute (via `show` handler) — conditional visibility, positive counterpart to `data-hidden`
- `data-class-*` attributes (via `classToggle()` factory) — per-class CSS toggle (e.g. `data-class-active`)
- `show`, `classToggle()`, `stringAttr`, `boolAttr`, `ariaAttr` handlers — import from `lume-js/handlers`
- `withPlugins(store, plugins)` — apply plugins (logging, validation, transforms) to a store, import from `lume-js/addons`
- `createDebugPlugin` / `debug` — developer logging addon (import from `lume-js/addons`)

## Unchanged

- `state(obj)` — same API, same contract
- `bindDom(root, store, { handlers })` — same API
- `data-bind`, `data-hidden`, `data-disabled`, `data-checked` attribute names
- Zero dependencies, no build step required

---

<!-- lume:nav -->
**← Previous: [Working with Arrays](../tutorials/working-with-arrays.md)** | **Next: [FAQ](faq.md) →**
<!-- /lume:nav -->
