# Changelog

## [2.0.1] - 2026-05-06

### Fixed
- **`a11y` — TOC heading order:** Replaced `<h6>` in the "On this page" sidebar label with a `<div>`, eliminating a WCAG heading-order violation (h6 with no preceding h2–h5 in the docs page).
- **`a11y` — Footer label contrast:** Changed three footer section labels from `text-fg-subtle` to `text-fg-muted` on the gh-pages site. `--fg-subtle` (#6a685f on dark background) measured 3.86:1 — below the WCAG AA threshold of 4.5:1 for small text. `--fg-muted` (#a3a098) measures ~7.9:1.

### Performance
- **`state` — `registerEffect` closure hoisting:** The `registerEffect` function is now defined once per `state()` call (before the `Proxy` constructor) instead of once per property read inside the `get` trap. Eliminates one closure allocation per reactive property access when effects are active, reducing GC pressure in effect-heavy scenarios.
- **`repeat` — eliminated per-update `Set` allocations:** `updateList()` previously allocated two `Set` objects plus a spread on every render when scroll preservation was enabled (to detect reorder). Replaced with a direct `elementsByKey.has()` loop using the pre-existing `elementsByKey` Map. Also merged the now-redundant `nextKeys` Set into the already-present `seenKeys` Set, removing a second allocation per update.

### Tests
- **321 tests passing** (from 319) | `state.js` now at 100% statement and branch coverage
- Added two targeted tests covering previously uncovered paths in `state.js`: effect error isolation (lines 151–152) and the MAX_ITERATIONS flush guard (lines 160–164)

---

## [2.0.0] - 2026-05-05

### Overview

**Stable release of Lume.js v2.** The reactive core API is now frozen forever.

This release incorporates all beta hardening work: scope-based read tracking via `withReadObserver`, the extracted plugin system via `withPlugins()`, comprehensive TypeScript declarations, minified CDN bundles, and 319 tests at 100% coverage. No breaking changes from v2.0.0-beta.3.

### Highlights
- **Core API frozen:** `state()`, `effect()`, `bindDom()` — signatures are permanent
- **319 tests** | 100% stmts/branches/funcs/lines across all 16 source files
- **Core bundle:** 2.45KB gzipped / 3KB budget (81.5%)
- **Zero breaking changes** from v2.0.0-beta.3

---

## [2.0.0-beta.3] - 2026-05-05

### Added
- **`createCleanupGroup()` addon** — collects cleanup/unsubscribe functions and disposes them all at once. Useful for teardown on route changes or component unmount.
- **`hydrateState()` addon** — reads initial state from a `<script type="application/json">` element in server-rendered HTML. Zero-config SSR hydration helper.
- **Minified CDN bundles** — `dist/index.min.mjs`, `dist/addons.min.mjs`, `dist/handlers.min.mjs` generated via Terser for direct CDN usage.
- **New guides:** `docs/guides/cleanup-and-dispose.md` and `docs/guides/ssr-hydration.md`

### Fixed
- **`repeat()` @experimental marker removed** — API is now considered stable
- **Docs sync:** README badges, size claims, and test counts updated to actual measured values

### Tests
- **319 tests passing** (from 303) | 100% stmts/branches/funcs/lines across all 16 source files

---

## [2.0.0-beta.2] - 2026-05-03

### Architecture
- **Replaced `registerEffectSystem` with `withReadObserver` scope-based read tracking:** `state.js` no longer holds a permanent reference to `effect.js`. Read tracking is only active during the synchronous execution of an effect's body via `withReadObserver(onRead, fn)`. Multiple simultaneous observers (nested effects, devtools) are supported via a `Set` of active readers. `state.js` is pure when no reader is active.
- **Replaced `globalThis.__LUME_CURRENT_EFFECT__`** with module-scoped `currentEffect` + `getCurrentEffect()` export — eliminates third-party spoofing of dependency tracking

### Fixed
- **`withPlugins` onNotify flush blocked writes:** `onNotify` no longer fires when `onSet` returns `oldValue` to block an update
- **`repeat` duplicate keys DOM corruption:** Duplicate keys are now skipped instead of overwriting element references in the keyed Map
- **`state()` phantom options parameter:** Removed non-existent `options` from TypeScript declaration and JSDoc examples
- **Runtime reactive brand symbol:** `Symbol.for('lume.reactive')` is now actually stamped by `state.js` (was fictional in beta.1)
- **Frozen/sealed object rejection:** `state()` now throws early instead of silently crashing when stamping the reactive brand on frozen or sealed objects
- **Flush loop error isolation:** Individual subscriber calls, effect executions, and `beforeFlush` hooks are each wrapped in `try/catch`. Entire `queueMicrotask` body wrapped in `try/finally` to guarantee `flushScheduled` is always reset. Scheduler recovers after catastrophic errors instead of stalling permanently.
- **`bindDom` path resolution no longer swallows all errors:** `resolvePath()` returns `null` for expected failures (null intermediates, missing properties). Removed blanket `try/catch` from `resolveProp` so unexpected errors propagate with full stack traces.
- **`repeat()` normalize `subscribe()` return values:** Handles RxJS-style Subscription objects (with `.unsubscribe()` method) in addition to callable unsubscribe functions, preventing `TypeError` during cleanup
- **`computed.dispose()` cancels stale microtasks:** Added `disposed` flag to guard effect body and microtask callback, preventing `isInComputation` from being reset after disposal
- **`$beforeFlush` hook deduplication:** Registering the same function reference multiple times no longer causes duplicate execution per flush

### Performance
- **Eliminated double microtask flush in `withPlugins`:** Collapsed `onNotify` + subscriber flushes into single microtask via `$beforeFlush` hook
- **Eliminated per-flush array allocations in `state.flush`:** Replaced `[...listeners[key]]` spread and `[...pendingEffects]` with stable-index `while` loops and pre-sized arrays
- **Replaced `filter`-based unsubscribe with `indexOf+splice`:** O(n) without allocation, correctly removes only first matching instance

### Environment Hardening
- **Console-less environment safety:** Added `src/utils/log.js` with `logWarn()` and `logError()` helpers that check `typeof console` before emitting. All core and addon files now import these instead of raw `console.*` calls, preventing `ReferenceError` in service workers and embedded engines.

### Changed
- **Plugin system stripped from core:** `state(obj, { plugins })` → `withPlugins(state(obj), [plugins])` from `lume-js/addons`
- **`isReactive()` moved to `lume-js/addons`:** Duck-typing via `$subscribe` check; no longer in core export
- **`resolvePath()` inlined into `bindDom.js`:** Deleted `src/core/utils.js` and `tests/core/utils.test.js`

### Improved
- **Developer Experience:** Named constants `MAX_LOG_LEN` / `TRUNCATED_LEN` in debug addon; removed dead `json &&` guard
- **TypeScript:** `TypedPlugin` re-exported from `lume-js/addons`
- **Documentation:** Added JSDoc warnings for circular computed dependencies and `bindDom` path-healing limitations. Added architectural comment explaining module-level readers Set behavior. Replaced innerHTML example with safe DOM API (`document.createElement()` + `textContent`).
- **TypeScript:** `$subscribe` method added to `ReactiveState<T>` declaration
- **Tests:** 303 tests | 100% stmts/branches/funcs/lines across all 15 source files

---

## [2.0.0-beta.1] - 2026-02-28

### Added
- **Extensible Handler System for `bindDom`**
  - Handler contract: `{ attr: string, apply(el, val): void }` — plain objects, no framework API
  - Pass handlers to `bindDom()` via `options.handlers`
  - Built-in handlers (always active, backward compatible):
    - `data-hidden`, `data-disabled`, `data-checked`, `data-required` (boolean props)
    - `data-aria-expanded`, `data-aria-hidden` (ARIA attributes)
  - User handlers override built-ins with same `attr` (Map deduplication)
  - Arrays auto-flattened (supports `classToggle()` returning multiple handlers)
  - Compiled selectors built from handler list for O(n) DOM performance

- **New `lume-js/handlers` module** (0.33KB gzipped, tree-shakeable)
  - `show` — `data-show="key"` shows element when truthy (inverse of `data-hidden`)
  - `boolAttr(name)` — toggle any boolean attribute via `toggleAttribute()`
  - `ariaAttr(name)` — any ARIA attribute with auto `aria-` prefix handling
  - `classToggle(...names)` — CSS class toggling (`data-class-{name}="key"`)
  - `stringAttr(name)` — string attributes with null removal (href, src, title, etc.)
  - `formHandlers` preset — `[boolAttr('readonly')]`
  - `a11yHandlers` preset — `[ariaAttr('pressed'), ariaAttr('selected'), ariaAttr('disabled')]`
  - Full TypeScript definitions (`src/handlers/index.d.ts`)

- **Handler API documentation** at `docs/api/core/handlers.md`
- **`./handlers` export path** in package.json
- **Handler interface** added to core TypeScript definitions (`Handler`, `BindDomOptions.handlers`)

### Changed
- **`bindDom` internal architecture**: Refactored from hardcoded `BOOLEAN_ATTRS`/`ARIA_ATTRS` arrays to composable handler pattern. No API breaking changes — existing code works without modification.

### Improved
- Test coverage: 231 tests across 11 test files (from 201)
- 30 new handler tests covering show, classToggle, boolAttr, ariaAttr, stringAttr, custom handlers, composition, overrides, presets, and edge cases
- Core size: 2.39KB gzipped (+60 bytes from handler interface)
- Updated README with handler system documentation
- Updated bindDom API docs with full handler reference
- Updated design-decisions.md with handler architecture rationale

---

## [2.0.0-alpha.2] - 2026-01-14

### Added
- **Event Delegation in `bindDom`**
  - Single delegated `input` listener on root element instead of per-element listeners
  - Uses `Map` for element → binding lookup (O(1) performance)
  - Reduces memory usage for forms with many inputs (N listeners → 1 listener)
  - 5 new event delegation tests covering deep nesting, cleanup, and edge cases
  - Internal optimization with no API changes — fully backward compatible

- **Create/Update API for `repeat` addon**
  - New `create` option: called once when element is created (for DOM structure)
  - New `update` option: called on every render (for data binding), receives `{ isFirstRender }` context
  - Reference + index optimization: `update` skipped if item reference AND index unchanged
  - Clean internal storage via Map (no DOM element pollution)
  - Backward compatible: `render` alone still works as before

- **Debug Addon (`createDebugPlugin`, `debug`)**
  - Per-store debug plugin with colored console output (GET/SET/NOTIFY/SUBSCRIBE)
  - Global controls: `debug.enable()`, `debug.disable()`, `debug.filter(pattern)`
  - Statistics tracking: `debug.stats()` (silent), `debug.logStats()` (console table)
  - Stack traces for SET operations (`trace: true`)
  - Dynamic options via getters for runtime UI toggling
  - TypeScript definitions and comprehensive documentation

- **Explicit Effect Dependencies**
  - New `deps` argument in `effect(fn, deps)` for manual dependency control
  - Dual-mode support: Auto-tracking (default) vs Explicit tuples `[store, key]`
  - Prevents accidental infinite loops and enables safe side-effects (logging, analytics)
  - Full TypeScript support with `EffectDependency` type
  - "Explicit over Magic" philosophy alignment

### Improved
- Test coverage increased to 15 for effect tests (from 9) with explicit dependency mode checks
- Test coverage increased to 29 for bindDom tests (from 24)
- Test coverage increased to 56 for repeat tests (from 46)
- 24 tests added for debug addon (new)
- Better memory cleanup via `bindingMap.clear()` on cleanup

---

## [2.0.0-alpha.1] - 2025-12-19

### Added
- **Plugin System (v2.0 Phase 1)**
  - 5 lifecycle hooks: `onInit`, `onGet`, `onSet`, `onSubscribe`, `onNotify`
  - Opt-in plugin support via `withPlugins(state(obj), [plugins])` wrapper (addon)
  - Chain pattern for `onGet` and `onSet` hooks (each plugin receives output of previous)
  - Full TypeScript definitions for plugin interface
  - Comprehensive plugin documentation at `docs/api/core/plugins.md`
  - 4 working plugin examples: debug, validation, history, transform

### Improved
- Test coverage increased to 148 tests (from 114 in v1.0.0)
- 34 new tests for plugin system covering all hooks and edge cases
- 100% code coverage maintained
- Documentation updated with v2.0+ markers
- Bundle size budget temporarily increased to 2KB (will optimize in Phase 2)

### Technical Details
- Bundle size: 1.98 KB / 2.00 KB gzipped (99.0% of budget)
- Backward compatible: All v1.0 code works unchanged
- Plugin system adds ~200 bytes to core
- Effects track key access (plugin `onGet` transforms don't affect tracking)

### Notes
- This is an **alpha release** for early adopters and community feedback
- Not recommended for production use
- Plugin system is stable, but bundle size will be optimized in Phase 2
- Phase 2 will move `effect` and `bindDom` to addons, reducing core size to ~1.8KB

---

## [1.0.0] - 2025-11-29

### Major Release
- **Stable API:** All core and most addon APIs are now stable and production-ready.
- **Website Launch:** Official documentation and interactive examples now live at [https://sathvikc.github.io/lume-js/](https://sathvikc.github.io/lume-js/).
- **Comprehensive Docs:** Full API, guides, and tutorials included in the repo and website.
- **Test Coverage:** 114 passing tests, 100% coverage for all features and edge cases.
- **Performance:** <2KB gzipped, no virtual DOM, zero dependencies, standards-only reactivity.
- **Features:**
  - Core: `state`, `bindDom`, `effect`, two-way binding, nested state, subscriptions
  - Addons: `computed`, `watch`, `isReactive`
  - **`repeat` Addon:** *Experimental* — efficient keyed list rendering, but API may evolve in future versions (see notes below)
  - TypeScript definitions for all APIs
  - Tree-shaking and bundler optimization
- **Examples:** Todo app, Tic-Tac-Toe, repeat-test, and more

#### Note on `repeat` Addon
`repeat` remains experimental in v1.0.0. Its API may evolve in future releases as it is refined to best fit Lume.js philosophy.

----

All notable changes to Lume.js will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [0.5.0] - 2025-11-28

### Added
- **`repeat` Addon (@experimental)**
  - Efficient list rendering with element reuse by key
  - Automatic subscription to array changes
  - Focus preservation strategy (customizable)
  - Scroll preservation strategy (customizable)
  - *Note: Requires immutable array updates (e.g. `store.items = [...items, new]`) instead of `push()`*

### Improved
- Documentation:
  - Added "Design Decisions" document explaining architectural choices
  - Clarified "Standards-Only" philosophy
  - Added explicit warnings about immutable array requirements
  - Updated test count to 114 tests (from 67)
- Examples:
  - Updated Todo app to use `repeat` for list rendering
  - Added Tic-Tac-Toe example demonstrating time travel and computed state
  - Added comprehensive `repeat-test` example with automated test suite for preservation features
- Testing:
  - Added test coverage for `repeat` with `computed` values
  - Added test coverage for non-reactive store error handling
  - 47 tests for `repeat` addon covering all features and edge cases

### Fixed
- Support for generic `.subscribe()` method in `repeat` (for `computed` integration)
- Regression tests added for array mutation behavior

---

## [0.4.1] - 2025-11-20

### Added
- `isReactive(obj)` function to check if an object is a Lume reactive proxy
- Auto-ready `bindDom()` with automatic DOMContentLoaded waiting
- `{ immediate: true }` option for `bindDom()` to skip auto-wait
- `exports` field in package.json for better tree-shaking
- `sideEffects: false` declaration for aggressive bundler optimization
- `src/addons/index.d.ts` for separate addon TypeScript definitions
- Complete TypeScript definitions for all v0.4.0+ features
- CHANGELOG.md (this file)

### Fixed
- Effect tracking now properly skips `$`-prefixed meta methods like `$subscribe`
- Cleanup function works correctly in both auto-ready and immediate modes
- TypeScript addon import resolution via proper exports mapping

### Improved
- Documentation for new features (`isReactive`, auto-ready bindDom)
- Type safety for computed and watch addon functions
- Tree-shaking optimization through package exports
- Developer experience for script placement (works anywhere)

---

## [0.4.0] - 2025-11-18

### Added
- **`effect()` - Automatic Dependency Tracking** (Core Feature)
  - Automatically tracks which state properties are accessed
  - Re-runs when dependencies change
  - Dynamic dependency collection
  - Returns cleanup function
  - Prevents infinite recursion
- **Per-State Microtask Batching**
  - Automatic batching of state updates
  - Reduces unnecessary DOM updates
  - Per-state flush cycles (no global scheduler)
  - Effect deduplication per flush
- **Enhanced `computed()` with Auto-Tracking**
  - Now uses `effect()` internally
  - Automatic dependency tracking (no manual recompute)
  - `.value` getter for cached value
  - `.subscribe()` for change notifications
  - `.dispose()` for cleanup
  - Removed `.recompute()` method (automatic now)
- **Comprehensive Test Suite**
  - 67 tests with 100% coverage
  - Tests for core, addons, and all input types
  - Edge case and error handling coverage
  - Vitest with jsdom environment
- **Bundle Size Monitoring**
  - `npm run size` script to check bundle size
  - Ensures core stays under 2KB budget
- **New Examples**
  - Todo app with CRUD, filters, persistence
  - Tic-tac-toe with game logic and time travel
  - Multi-step form with validation and async checks
- **TypeScript Definitions**
  - Complete type definitions in `index.d.ts`
  - Generic type safety for all APIs
  - JSDoc examples for IntelliSense

### Changed
- **BREAKING:** `computed()` no longer has `.recompute()` method
  - Automatically recomputes when dependencies change
  - Migration: Remove all `.recompute()` calls
- State updates now batched in microtasks (slight timing change)
- `$subscribe()` still calls immediately (not batched)

### Fixed
- Import paths in tests now use alias instead of relative paths
- Better error handling with `[Lume.js]` prefixed messages
- Errors in effects and computed values logged properly

### Performance
- Reduced DOM updates via batching (80%+ reduction in multi-update scenarios)
- Effect overhead < 0.001ms per property access
- No memory leaks from subscription accumulation

---

## [0.3.0] - 2025-11-10

### Added
- `computed()` addon for derived values (manual recompute)
- `watch()` addon as convenience wrapper for `$subscribe`
- Basic form examples
- Initial test coverage

### Changed
- Improved error messages
- Better nested state handling

---

## [0.2.0] - 2025-11-05

### Added
- Core `state()` function with Proxy-based reactivity
- `bindDom()` for DOM binding via `data-bind` attribute
- `$subscribe()` for manual subscriptions
- Two-way binding for form inputs
- Nested state support (explicit wrapping)
- TypeScript definitions
- Basic documentation

### Features
- Standard-only approach (data-* attributes)
- No build step required
- < 2KB gzipped
- Works with any library

---

## [0.1.0] - 2025-11-01

### Added
- Initial proof of concept
- Basic reactivity with Proxy
- Simple DOM binding

---

## Links

- **Repository:** https://github.com/sathvikc/lume-js
- **npm Package:** https://www.npmjs.com/package/lume-js
- **Bug Reports:** https://github.com/sathvikc/lume-js/issues

---

## Version Format

- **Major.Minor.Patch** (e.g., 1.0.0)
- **Major:** Breaking changes
- **Minor:** New features (backward compatible)
- **Patch:** Bug fixes and improvements
