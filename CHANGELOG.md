# Changelog

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
- Examples:
  - Updated Todo app to use `repeat`
  - Added Tic-Tac-Toe example demonstrating time travel and computed state

### Fixed
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
