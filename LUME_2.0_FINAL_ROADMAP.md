# Lume.js 2.0.0 - Final Roadmap

**Version:** 2.0.0  
**Target Release:** Q1 2026  
**Philosophy:** Radical simplification - State.js is the only core  
**Positioning:** Still a reactive library, now with plugin architecture (toolkit evolution comes later)

---

## Executive Summary

Lume 2.0 represents a fundamental architectural shift that makes Lume truly universal and infinitely extensible while maintaining its <2KB promise. The core breakthrough is a **plugin system** that decouples all features, allowing `state.js` to work anywhere (Node.js, Deno, browsers, CLI tools) while optional features add zero bytes unless imported.

**Key Metric:** State.js alone = ~1KB. Full bundle (state + effect + bindDom) = ~2KB.

---

## Core Changes

### 1. Plugin System Architecture ⭐⭐⭐⭐⭐

**What:** State.js becomes a pure reactive core with before/after hooks for everything.

**Why:** Current coupling between state.js and effect.js violates the stated goal of universal reactivity. Effects shouldn't exist in Node.js apps, yet they're baked into the core.

**Impact:**
- ✅ State.js works in any JavaScript environment
- ✅ Zero-cost abstractions (unused features = 0 bytes)
- ✅ Third-party plugins possible
- ✅ Effect becomes proof-of-concept addon

**Implementation:** [LUME_2.0_ROADMAP.md](LUME_2.0_ROADMAP.md#L147-L343) - See "Plugin System Architecture (REVISED)"

**Size:** Core with plugin system = ~1KB

---

### 2. Effect as Addon ⭐⭐⭐⭐⭐

**What:** `effect()` moves from core to addon, using the plugin system.

**Why:** 
- Effects are DOM-specific in practice
- Node.js state management doesn't need effect tracking
- Proves plugin system works
- Enables tree-shaking for non-effect users

**Migration:**
```javascript
// Still works from main export (for convenience)
import { state, effect } from 'lume-js';

// Or explicitly as addon
import { state } from 'lume-js';
import { effect } from 'lume-js/addons';
```

**Implementation:** [LUME_2.0_ROADMAP.md](LUME_2.0_ROADMAP.md#L221-L278) - See "effect.js as Plugin"

**Size:** +300 bytes (only when imported)

---

### 3. Debug System ⭐⭐⭐⭐

**What:** Production-grade debugging tools with zero runtime cost when unused.

**Features:**
- Property access tracing
- Effect execution logging
- Dependency graph visualization
- Performance profiling
- Browser devtools integration (`window.lumejs.debug`)
- Tree-shakeable (0 bytes if not imported)

**Usage:**
```javascript
// In browser console
lumejs.debug.enable('DEBUG');
lumejs.debug.filter('count');
lumejs.debug.stats();
```

**Implementation:** [LUME_2.0_ROADMAP.md](LUME_2.0_ROADMAP.md#L350-L584) - See "Debug & Logging System"

**Size:** ~1KB addon (tree-shaken if not used)

---

### 4. Minified Production Build ⭐⭐⭐⭐⭐

**What:** Ship minified + gzipped builds with size verification.

**Why:** The "<2KB" claim needs to be verifiable and honest.

**Deliverables:**
- `dist/lume.min.js` (minified UMD)
- `dist/lume.esm.min.js` (minified ESM)
- Size badges in README
- CI/CD size regression tests
- Bundle size visualization

**Tools:**
- Rollup + Terser for minification
- `size-limit` for CI checks
- `bundlephobia.com` integration

**Size verification:**
```bash
npm run build:size
# Output:
# core (state + plugins): 1.1 KB
# + effect: 1.4 KB
# + bindDom: 1.9 KB ✓ Under 2KB budget
```

---

## Secondary Changes

### 5. Improved repeat() API ⭐⭐⭐⭐

**What:** Separate `onCreate` and `onUpdate` callbacks for clarity.

**Before:**
```javascript
repeat(container, store, 'items', {
  render: (item, el) => {
    if (!el.dataset.init) {
      // One-time setup
      el.dataset.init = true;
    }
    // Updates
  }
});
```

**After:**
```javascript
repeat(container, store, 'items', {
  key: item => item.id,
  onCreate: (item, el) => {
    // One-time setup
  },
  onUpdate: (item, el) => {
    // Updates only
  }
});
```

**Implementation:** [LUME_2.0_ROADMAP.md](LUME_2.0_ROADMAP.md#L696-L749) - See "Better repeat Initialization"

**Size:** No change (refactor only)

---

## Documentation Overhaul

### Critical New Docs

1. **Understanding Reactivity** - Deep dive into dependency tracking
2. **Plugin Development Guide** - How to create custom plugins
3. **Performance Guide** - Profiling and optimization
4. **Migration Guide** - 1.x → 2.0 breaking changes
5. **Complex Example** - Real game (not just todo apps)

**See:** [LUME_2.0_ROADMAP.md](LUME_2.0_ROADMAP.md#L829-L998) - "Documentation Improvements"

---

## Package Structure

### New Exports

```javascript
// Core (universal - works everywhere)
import { state, plugin } from 'lume-js'; // ~1KB

// Full bundle (most common)
import { state, effect, bindDom } from 'lume-js'; // ~2KB

// Addons (tree-shakeable)
import { computed, repeat, watch } from 'lume-js/addons';
import { debug, profiler } from 'lume-js/addons/debug';
```

### File Structure

```
src/
  index.js              # Main exports (state, effect, bindDom)
  core/
    state.js            # Core with plugin system (~1KB)
    debug.js            # Debug utilities (~1KB)
  addons/
    effect.js           # Effect addon (~300 bytes)
    bindDom.js          # DOM binding (~500 bytes)
    computed.js         # Computed values
    repeat.js           # List rendering
    watch.js            # Watchers
```

---

## Breaking Changes from 1.x

### API Changes

1. **Plugin registration required for effects** (auto-registered in main export)
2. **Global effect context removed** (internal change, no user impact)
3. **repeat() signature enhanced** (backward compatible)
4. **Debug APIs are new** (additive only)
5. **Deprecation warnings** added for internal API access (`__LUME_CURRENT_EFFECT__`)

### Migration Path

Most 1.x code works unchanged:
```javascript
// 1.x code still works
import { state, effect, bindDom } from 'lume-js';

const store = state({ count: 0 });
effect(() => console.log(store.count));
bindDom(document.body, store);
```

**Only breaks** for users directly accessing internal APIs (`__LUME_CURRENT_EFFECT__`).

**Deprecation handling:**
- Console warnings when accessing deprecated internals
- Warnings include migration guide link
- Internals still work in 2.0 but log warnings
- Complete removal in 3.0

**Migration guide:** Will provide detailed upgrade path for edge cases.

---

## What's NOT in 2.0

These are documented for future consideration but **explicitly excluded from 2.0**:

### Deferred to 2.0.1+ (Documentation Only)

- ❌ **SPA Patterns Guide** - Document composable instances, routing, lifecycle (can be added post-release with patches)
SPA Composition Patterns ⭐⭐⭐⭐

**What:** Document patterns for building SPAs with composable, isolated Lume instances.

**Use Cases:**
- Multi-view apps with client-side routing
- Isolated widget/component composition
- Micro-frontend architecture
- Progressive enhancement of static sites

**Pattern 1: Isolated State Scopes**
```javascript
// Each "component" is an isolated Lume instance
function createWidget(container, initialState) {
  const state = state(initialState);
  const cleanup = bindDom(container, state);
  
  return {
    state,
    destroy: () => cleanup()
  };
}

// Parent controls lifecycle
const widgets = {
  todos: createWidget('#todos', { items: [] }),
  profile: createWidget('#profile', { user: {} })
};
```

**Pattern 2: View-Based Routing**
```javascript
import page from 'page'; // Or any tiny router

const app = state({ 
  currentView: null,
  activeWidget: null 
});

page('/todos', () => {
  app.activeWidget?.destroy(); // Cleanup previous
  app.currentView = 'todos';
  app.activeWidget = createWidget('#main', { items: [] });
});

page('/profile', () => {
  app.activeWidget?.destroy();
  app.currentView = 'profile';
  app.activeWidget = createWidget('#main', { user: {} });
});
```

**Pattern 3: Effect-Based Mounting**
```javascript
const app = state({ view: 'home' });
let currentWidget = null;

effect(() => {
  currentWidget?.destroy();
  
  if (app.view === 'todos') {
    currentWidget = createWidget('#app', { items: [] });
  } else if (app.view === 'profile') {
    currentWidget = createWidget('#app', { user: {} });
  }
});
```

**Why Document This:**
- ✅ Already works - just needs clear patterns
- ✅ Enables complex apps without framework
- ✅ Micro-frontend architecture support
- ✅ Progressive enhancement story

**Documentation Location:** `docs/guides/spa-patterns.md`

**Future Exploration (3.0+):**
- Parent-child state communication patterns
- Shared state across isolated instances
- Lazy loading of Lume widgets
- SSR hydration of isolated components

### Deferred to 2.1+ (See roadmap parts 2-4 for details)

- ❌ jQuery replacement utilities → [lume-roadmap-part2.md](lume-roadmap-part2.md#L1-L76)
- ❌ MCP integration → [lume-roadmap-part3.md](lume-roadmap-part3.md#L351-L663)
- ❌ Form validation addon → [lume-roadmap-part3.md](lume-roadmap-part3.md#L765-L839)
- ❌ Persistence addon → [lume-roadmap-part3.md](lume-roadmap-part3.md#L845-L943)
- ❌ Time travel/undo → [lume-roadmap-part3.md](lume-roadmap-part3.md#L949-L1057)
- ❌ Web workers → [lume-roadmap-part3.md](lume-roadmap-part3.md#L1063) & [lume-roadmap-part4.md](lume-roadmap-part4.md#L1-L39)
- ❌ Canvas/WebGL → [lume-roadmap-part4.md](lume-roadmap-part4.md#L45-L154)
- ❌ SSR (separate project)
- ❌ DevTools extension

### On Hold (Needs More Thought)

- ⏸️ MutationObserver for dynamic elements (adds complexity, edge cases unclear)
- ⏸️ Core data-* handlers beyond `data-bind` (bloats bindDom unnecessarily)
- ⏸️ Reactive arrays helper (against explicit philosophy)

### Never Adding (Against Philosophy)

- ❌ Magic nested reactivity
- ❌ Built-in router
- ❌ Component system
- ❌ HTTP/fetch wrapper

**Rationale:** [LUME_2.0_ROADMAP.md](LUME_2.0_ROADMAP.md#L780-L819) - See "SHOULD NOT ADD"

---

## Timeline

### Phase 1: Core Refactor (Weeks 1-2)
- [ ] Implement plugin system in state.js
- [ ] Move effect to addon
- [ ] Add plugin registration API
- [ ] Unit tests for plugin hooks

### Phase 2: Enhanced Features (Weeks 3-4)
- [ ] Improve repeat() API (onCreate/onUpdate split)
- [ ] Add deprecation warnings for internal APIs
- [ ] Create migration examples

### Phase 3: Developer Tools (Weeks 5-6)
- [ ] Implement debug system
- [ ] Add profiler addon
- [ ] Browser devtools integration
- [ ] Tree-shaking verification

### Phase 4: Production Build (Weeks 7-8)
- [ ] Minified build pipeline
- [ ] Size regression tests
- [ ] Bundle analysis tools
- [ ] Performance benchmarks

### Phase 5: Documentation (Weeks 9-10)
- [ ] Update all API docs
- [ ] Write migration guide (with deprecation details)
- [ ] New tutorial: Understanding Reactivity
- [ ] Plugin development guide
- [ ] Complex example (game)

### Phase 6: Testing & Release (Weeks 11-12)
- [ ] Alpha release (2.0.0-alpha.1)
- [ ] Beta release (2.0.0-beta.1)
- [ ] Final testing
- [ ] 2.0.0 release

---

## Success Metrics

### Technical Goals

- ✅ State.js: <1.2KB minified + gzipped
- ✅ Full bundle: <2KB minified + gzipped
- ✅ Tree-shaking removes 100% of unused code
- ✅ Works in Node.js, Deno, browsers
- ✅ Zero console warnings/errors
- ✅ 100% test coverage on core

### Performance Goals

- ✅ <10% overhead vs vanilla JS (no plugins)
- ✅ <30% overhead with plugins
- ✅ Effect batching works correctly
- ✅ No memory leaks in repeat()

### Documentation Goals

- ✅ 4+ comprehensive tutorials
- ✅ Migration guide from 1.x
- ✅ Plugin development guide
- ✅ Complex real-world example
- ✅ Performance optimization guide

---

## Checklist Before Release

### Code
- [ ] All tests passing (100% coverage)
- [ ] Bundle size verified (<2KB)
- [ ] Tree-shaking tested
- [ ] Performance benchmarks documented
- [ ] TypeScript definitions updated
- [ ] Works in Node.js 18+, Deno 1.30+
- [ ] Browser compatibility tested (Chrome, Firefox, Safari)

### Documentation
- [ ] API reference complete
- [ ] Migration guide written
- [ ] 4+ tutorials published
- [ ] Plugin guide complete
- [ ] Complex example added
- [ ] FAQ updated
- [ ] Changelog detailed

### Infrastructure
- [ ] CI/CD pipeline configured
- [ ] Automated size checks
- [ ] Automated releases
- [ ] npm package published
- [ ] GitHub release created
- [ ] Website updated

### Community
- [ ] Discord/forum ready
- [ ] Contributing guide updated
- [ ] Code of conduct published
- [ ] Issue templates created
- [ ] Launch blog post written

---

## Why 2.0 is a Significant Upgrade

1. **Architectural Revolution** - Plugin system enables infinite extensibility with zero cost
2. **True Universality** - State.js works in any JavaScript environment
3. **Honest Size Claims** - Minified builds prove the <2KB promise
4. **Professional Debugging** - Debug system on par with major frameworks
5. **Enhanced DX** - Better APIs, clearer docs, real examples
6. **Future-Proof** - Plugin architecture enables all future features without breaking core

**This isn't just an incremental update - it's a fundamental rethinking of what a reactive library can be.**

---

## Future Vision (Reference Only)

For ideas beyond 2.0, see:

- **2.1-2.2 Features:** [lume-roadmap-part2.md](lume-roadmap-part2.md) & [lume-roadmap-part3.md](lume-roadmap-part3.md)
- **3.0+ Platform:** [lume-roadmap-part4.md](lume-roadmap-part4.md)
- **Long-term Vision:** [lume-roadmap-part4.md](lume-roadmap-part4.md#L978-L1026) - "The Vision"

These are brainstorming documents - not commitments. They help inform future direction without constraining 2.0 focus.

---

## Versioning & Documentation Strategy

### Git Strategy (Single Repo, Multiple Versions)

**Don't duplicate code.** Use tags + docs snapshots:

```bash
# Tag releases
git tag v1.0.0
git tag v2.0.0
git tag v2.1.0

# Docs structure
docs/
  versions/
    v1.0/         # Snapshot at v1.0.0 release
    v2.0/         # Current development
  latest/         # Symlink → v2.0/
```

**Build process:**
```bash
# On release, snapshot docs
npm run docs:snapshot -- --version=v2.0.0

# Website generates from all versions
npm run site:build
# Outputs:
#   site/docs/v1.0/
#   site/docs/v2.0/
#   site/docs/        → latest (v2.0)
```

**URL structure:**
- `lume-js.org/docs/` → Latest version
- `lume-js.org/docs/v1.0/` → v1 docs
- `lume-js.org/docs/v2.0/` → v2 docs

**Version selector:** Dropdown in nav showing all versions

**Examples to follow:**
- Deno: `deno.land/manual@v1.37`
- Rust: `doc.rust-lang.org/1.70.0/`
- TypeScript: `typescriptlang.org/docs/handbook/release-notes/`

### What Gets Versioned

Everything in the repo:
- ✅ Source code (via git tags)
- ✅ Documentation (snapshot on release)
- ✅ Examples (snapshot on release)
- ✅ Tests (via git tags)
- ✅ Type definitions (via git tags)

**Process:**
1. Development happens on `main`
2. On release: `npm run release -- --version=2.0.0`
   - Creates git tag `v2.0.0`
   - Snapshots `docs/` → `docs/versions/v2.0/`
   - Snapshots `examples/` → `examples/versions/v2.0/`
   - Publishes to npm
3. Users can check out any tag to see full codebase at that version

**No need for version branches.** Tags are enough.

---

## Questions?

- **Technical details:** See [LUME_2.0_ROADMAP.md](LUME_2.0_ROADMAP.md)
- **Architecture deep-dive:** Search for specific sections referenced above
- **Future features:** Browse the part 2-4 roadmap files
- **Philosophy:** [LUME_2.0_ROADMAP.md](LUME_2.0_ROADMAP.md#L53-L94) - "Core Philosophy Validation"

---

**Let's ship it.** 🚀
