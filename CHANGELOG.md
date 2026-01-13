# Changelog

## [Unreleased]

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

### Improved
- Test coverage increased to 29 bindDom tests (from 24)
- Test coverage increased to 56 repeat tests (from 46)
- Better memory cleanup via `bindingMap.clear()` on cleanup

---

## [2.0.0-alpha.1] - 2025-12-19

### Added
- **Plugin System (v2.0 Phase 1)**
  - 5 lifecycle hooks: `onInit`, `onGet`, `onSet`, `onSubscribe`, `onNotify`
  - Opt-in plugin support via `state(obj, { plugins: [...] })`
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
