# Lume.js Vision & Strategic Direction

> **Purpose:** Consolidated reference document synthesizing all architectural ideas, philosophy, and future plans.  
> **Last Updated:** 2026-01-14  
> **Status:** Living document - update as vision evolves

---

## Core Philosophy

> **"Web standards are good enough. If web standards are good enough, then Lume.js is good enough."**

### The Belief System

1. **Standards-only** — `data-*` attributes, standard JavaScript APIs, valid HTML
2. **No build step required** — works directly in browser
3. **Minimal bundle** — <2KB core, pay for what you use
4. **Explicit over magic** — no hidden behavior
5. **Longevity over trends** — code written today should work in 2035

### What We're NOT Building

- ❌ A React competitor
- ❌ A framework
- ❌ A comprehensive solution for everything

### What We ARE Building

- ✅ An alternative path for those who value standards
- ✅ A proof that complexity is unnecessary
- ✅ A reminder that the web was designed to be simple

---

## Mission Statement

**"What if we just didn't break the web?"**

- Use real HTML elements → Accessibility works
- Use standard events → DevTools work
- Use native modules → No build needed
- Use platform APIs → Code outlasts frameworks

---

## Target Audience

1. **New developers** learning web dev (want to understand what's happening)
2. **Backend developers** adding frontend (PHP, Python, Ruby devs wanting sprinkles of JS)
3. **Indie hackers / Solopreneurs** (building fast, no 2GB node_modules)
4. **Consultants / Agencies** (need long-term maintainability)
5. **Embedded/Widget developers** (strict size budgets, can't control host)

---

## Strategic Recommendations

> **AI Assessment:** Based on analysis of all archive docs, here's what will actually move the needle.

### 🔴 Do Now (High Impact, Low Effort)

| Priority | What | Why |
|----------|------|-----|
| ~~**1**~~ | ~~**Event delegation in bindDom**~~ | ✅ **DONE** - Single listener on root, 29 tests pass |
| ~~**2**~~ | ~~**Keyed diffing in repeat()**~~ | ✅ **DONE** - create/update separation, reference optimization |
| **3** | **V2 Final Polish** | Fix issues from PR review: <br>1. [ ] Add `create`/`update` types to `RepeatOptions` in `index.d.ts`<br>2. [ ] Use `WeakMap` in `bindDom` for memory safety |
| **4** | **data-show handler** | Most requested feature after data-bind, ~50 bytes |
| **5** | **data-class handler** | Second most requested, ~150 bytes |
| **6** | **Debug addon** | Critical for adoption - hard to debug = hard to adopt |

### 🟡 Do Later (High Impact, High Effort)

| Priority | What | Why Defer |
|----------|------|-----------|
| **6** | **Decouple effect from state** | Important for universal core goal, but requires careful refactoring |
| **7** | **spaMode for bindDom** | Only needed for SPAs with innerHTML; can wait for demand |
| **8** | **Framework adapters** | Nice-to-have, but Lume already works with any framework manually |
| **9** | **Form validation addon** | Common need, but users can build it themselves |
| ~~**10**~~ | ~~**Explicit Effect Dependencies**~~ | ✅ **DONE** - Support `effect(fn, [deps])` with dual mode (auto/explicit) |

### 🟢 Maybe Later (Low Priority)

| Feature | Status |
|---------|--------|
| MCP/AI integration | Cool idea, but niche. Wait for user demand. |
| Web Worker integration | Specialized use case |
| Canvas/WebGL binding | Very niche |
| jQuery utilities | Users can use native DOM APIs |
| Web Components registry | Scope creep - let community build these |
| TC39 Signals | Wait for standard to stabilize |
| Edge database sync | Way out of scope |

### ❌ Skip Entirely

| Feature | Why |
|---------|-----|
| **Component system** | Scope creep. HTML + web components exist. |
| **Router** | Out of scope. Many good routers exist. |
| **Magic nested reactivity** | Violates explicit philosophy + performance cost |
| **Built-in HTTP/fetch** | Not related to reactivity |
| **Virtual scrolling** | Too complex, better as community addon |
| **Reactive CSS (Houdini)** | Browser support too limited |

### The 80/20 Rule

**80% of value comes from:**
1. Event delegation (performance)
2. data-show + data-class (DX)
3. Debug addon (adoptability)
4. Better docs (discoverability)

**Everything else is optimization for edge cases.**

---

## 🚨 Open Challenge: Code Verbosity

> **Added:** 2026-01-14  
> **Status:** Unsolved — needs breakthrough ideas

### The Problem

Lume.js currently **does not reduce code** compared to vanilla JavaScript in many cases. This undermines the core value proposition.

**Comparison (Debug Demo):**

| Approach | Lines | Notes |
|----------|-------|-------|
| Vanilla JS (imperative) | ~250 | Direct DOM manipulation |
| Lume.js (showcase) | ~360 | Uses repeat, effect, watch, bindDom |
| React/Vue/Svelte | ~150 | Build step, custom syntax |

**The harsh truth:** If using Lume.js adds code compared to vanilla JS, why use it?

### Why This Happened

1. **`repeat()` is verbose** — `key`, `create`, `update`, `element` options
2. **Reactive patterns add boilerplate** — stores, subscriptions, effects
3. **Demo was designed to showcase** — not minimize code
4. **XSS safety added lines** — but this isn't Lume-specific

### The Constraint

We cannot:
- ❌ Add build step
- ❌ Add custom syntax beyond `data-*`
- ❌ Add magic/implicit behavior

We must:
- ✅ Stay standards-only
- ✅ Keep it explicit
- ✅ Reduce code vs vanilla JS

### Brainstorm Seeds (For Future)

1. **What if `data-*` did more work?** — Push boundaries of declarative HTML
2. **What patterns repeat most?** — Find boilerplate in real apps, not demos
3. **New Web APIs?** — Template literals, Proxy, WeakRef — any untapped potential?
4. **Less is more?** — Maybe the answer is removing features, not adding them

### Success Criteria

Lume.js must prove:
```
Lume.js code < Vanilla JS code
```

While maintaining:
```
Lume.js complexity ≈ Vanilla JS complexity
```

**This is the hardest problem Lume.js faces.**

---

## Architecture Vision

### Current State (v2-alpha)

```
Core: state, effect, bindDom
Addons: computed, watch, repeat
Plugins: state-level hooks (onGet, onSet, onNotify, etc.)
```

### Future State

```
Core: state + plugins only (~1KB)
├── Works in Node.js, Deno, Browser, CLI

Addons (tree-shakeable):
├── effect.js (~300B) — moved from core, uses plugin system
├── bindDom.js (~500B) — moved from core, DOM-specific
├── computed.js
├── watch.js
├── repeat.js
└── debug.js (dev only)
```

### Key Architectural Decisions

| Decision | Rationale |
|----------|-----------|
| **state.js as only core** | Backend-compatible, universal |
| **effect as addon** | Proves plugin system works |
| **bindDom as addon** | DOM-specific, not needed in Node.js |
| **Plugin hooks everywhere** | Infinite extensibility without bloat |

---

## Known Limitations (Honest Assessment)

### Where Lume Struggles

1. **Large lists with complex items** — manual DOM for 20+ fields per row
2. **Deeply nested state** — verbose wrapping or inefficient re-renders
3. **Conditional rendering** — no expression evaluation in attributes
4. **Component isolation** — global namespace, manual bookkeeping
5. **No lifecycle hooks** — manual cleanup tracking
6. **Virtual scrolling** — all elements must exist in DOM
7. **Code splitting** — no built-in lazy loading

### Performance Gaps

| Metric | Solid.js | Lume.js | Gap |
|--------|----------|---------|-----|
| Proxy vs signals (1M reads) | ~20ms | ~40ms | 2x slower |
| 10,000 state updates | ~8ms | ~15ms | 2x slower |
| List update (1 in 1000) | ~0.5ms | ~25ms | 50x slower |

### The Fundamental Trade-off

- **Chose:** Standards compliance, longevity, zero build
- **Accepted:** More verbose for complex UIs, can't match compile-time optimization

---

## Event Delegation Strategy

### The SPA Binding Problem

When `innerHTML` recreates DOM:
- `addEventListener` bindings are lost ❌
- Property subscriptions hold stale element references ❌

### Solution: Two-Part Approach

1. **DOM→State (input events):** Use event delegation on container
2. **State→DOM (property updates):** Re-query elements or use MutationObserver

### Implementation Plan

- **v2.0:** Delegation as internal implementation (no API change, performance win)
- **v2.x:** Add `spaMode: true` option for full SPA support
- **v3.0:** Full bindDom plugin system if demand warrants

### Why Built-in Over Plugins for Core Features

- Zero overhead for common path
- Plugins for extensions only (data-click, data-show)
- Performance is primary motivation, not just SPA support

---

## Performance Roadmap

### Immediate Improvements

1. **Event delegation in bindDom** — 1 listener vs N listeners
2. **Eliminate plugin overhead when no plugins** — fast path
3. **Keyed list diffing in repeat** — 50x improvement potential

### Core Optimizations

- Use `Object.create(null)` instead of `{}` for listeners
- Pre-compute plugin hooks at registration time
- Use `Object.is()` for value comparison (handles NaN, -0)
- Unroll plugin loops for single-plugin case

### Benchmark Targets

- Property access: within 2x of native
- Effect execution: <0.01ms overhead per property
- List updates: match Solid's keyed reconciliation

---

## Developer Tools Vision

### Debug System (Addon) ✅ IMPLEMENTED

```javascript
import { createDebugPlugin, debug } from 'lume-js/addons';

// Per-store debug plugin (simple - static options)
const store = state({ count: 0 }, { 
  plugins: [createDebugPlugin({ 
    label: 'myStore',
    logGet: true,   // Log GET operations
    trace: true     // Show stack traces
  })] 
});

// Global controls
debug.enable();           // Enable logging
debug.disable();          // Disable logging  
debug.filter('count');    // Filter by key pattern (string or RegExp)
debug.stats();            // Get stats data (silent - programmatic use)
debug.logStats();         // Log stats to console with table
debug.resetStats();       // Clear statistics

// Advanced: Dynamic options with getters (for UI toggles)
const config = { logGet: false };
const store2 = state({ name: '' }, { 
  plugins: [createDebugPlugin({ 
    label: 'dynamic',
    get logGet() { return config.logGet; }  // Reads at runtime
  })] 
});
config.logGet = true;  // Toggle at runtime
```

### Current Features (v2.0)

- [x] Colored console output (GET/SET/NOTIFY/SUBSCRIBE)
- [x] Per-store labels for multi-store apps
- [x] Global enable/disable toggle
- [x] Key filtering (string or RegExp)
- [x] Statistics tracking with silent `stats()` and formatted `logStats()`
- [x] Stack traces for SET operations (`trace: true`)
- [x] Dynamic options with getters for runtime toggling

### Future Features (High Priority)

| Feature | Description | Effort |
|---------|-------------|--------|
| **Redux DevTools integration** | Visual state inspector, action replay, time travel | Medium |
| **State snapshots** | Save/restore state for debugging | Medium |
| **Batched update grouping** | Group notifications in console.group() | Low |
| **Store label filtering** | Filter logs by store label, not just key pattern | Low |

### Future Features (Advanced)

| Feature | Description | Effort |
|---------|-------------|--------|
| **Browser extension** | Visual state inspector panel | High |
| **Dependency graph** | Visualize effect dependencies | High |
| **Performance profiler** | Measure effect/render times | Medium |
| **Time travel debugging** | Record state changes and replay them | Medium |
| **Conditional breakpoints** | Break on specific value changes | Medium |

---

## Framework Adapters (Future)

```javascript
// React
import { useStore } from '@lume-js/react';
const count = useStore(store, 'count');

// Vue
import { useStore } from '@lume-js/vue';
const count = useStore(store, 'count');
```

### Packages to Create

- `@lume-js/react` — React hooks
- `@lume-js/vue` — Vue 3 composables
- `@lume-js/angular` — Angular services
- `@lume-js/svelte` — Svelte stores bridge
- `@lume-js/solid` — Solid signals bridge

---

## Bundle Transparency (Idea)

### Concept

Let users see the cost of each import before they use it.

### Options

1. **Documentation-based** — table of sizes
2. **Website tool** — interactive checkboxes, live size calculation
3. **CLI tool** — `npx lume-bundle --features state,effect`

### Key Constraint

Old imports continue to work:
```javascript
import { state, bindDom, effect } from 'lume-js';
```

---

## Optional Build Step (Future Idea)

### Concept

User code unchanged, build step adds performance boost.

```javascript
// User writes (works without build)
effect(() => console.log(store.count));

// Build step transforms to (faster runtime)
_effect([store, 'count'], () => console.log(store.count));
```

### Benefits

- No learning curve difference
- Gradual adoption
- Progressive enhancement

### Implementation

Babel/SWC plugin that analyzes reactive reads.

---

## Competitive Positioning

### Size Comparison

| Library | Size (gzipped) | Build Required |
|---------|----------------|----------------|
| **Lume.js** | ~2KB | No |
| Alpine.js | ~15KB | No |
| Preact | ~4KB | Yes |
| Solid | ~7KB | Yes |
| Svelte | ~2KB* | Yes |
| Vue | ~35KB | Recommended |
| React | ~45KB | Yes |

*Svelte compiles away, but requires build.

### Unique Value Proposition

> "Svelte-like size, Alpine-like simplicity, no build step, works everywhere."

### What Makes Us Different

- **Alpine:** "Lightweight framework" (breaks HTML standards)
- **Stimulus:** "Modest JavaScript" (not reactive)
- **Van.js:** "Ultra minimal" (no HTML, JS-only)
- **Lume:** "Web standards, made reactive"

---

## Will NOT Add (Philosophy Violations)

| Feature | Why Not |
|---------|---------|
| Magic nested reactivity | Against explicit philosophy, performance cost |
| Built-in router | Environment-specific, scope creep |
| Component system | HTML is the component system |
| Custom directive syntax | Breaks standards-only principle |
| Build step requirement | Breaks no-build principle |
| Virtual DOM | Too complex for minimal philosophy |
| Lifecycle hooks | Too framework-y |

---

## Data-* Handler Extensions (bindDom Plugin System)

### Built-in (Core bindDom)

| Handler | Purpose | Size |
|---------|---------|------|
| `data-bind` | Two-way binding (existing) | ~200B |
| `data-show` | Conditional visibility | ~50B |
| `data-class` | Dynamic CSS classes | ~150B |

### Extended Handlers (Via Addon)

| Handler | Purpose | Size |
|---------|---------|------|
| `data-attr` | Dynamic attributes (src, href, etc.) | ~100B |
| `data-style` | Dynamic inline styles | ~100B |
| `data-on` | Declarative event handlers | ~200B |
| `data-text` | Safe text content | ~50B |
| `data-html` | Dangerous innerHTML (⚠️) | ~50B |

### Handler Registration API

```javascript
// Custom handler registration
import { registerDataHandler } from 'lume-js';

registerDataHandler('data-tooltip', (el, store, stateKey) => {
  return store.$subscribe(stateKey, (text) => {
    el.setAttribute('title', text);
  });
});
```

**Philosophy:** Built-in handlers are always available. Extended handlers are opt-in via addon import.

---

## MCP / AI Integration (Future)

### Concept

Separate package: `@lume-js/mcp-server`

Enables AI assistants (Claude, ChatGPT) to:
- Generate Lume components from natural language
- Analyze dependency graphs and suggest fixes
- Convert React/Vue/Alpine to Lume
- Debug reactivity issues

### Proposed Tools

| Tool | Purpose |
|------|---------|
| `create-component` | Generate HTML + JS from description |
| `analyze-reactivity` | Debug dependency graph |
| `migrate-from` | Convert from other frameworks |
| `debug-reactivity` | Help diagnose effect issues |

**Strategic Advantage:** First-mover in AI tooling for reactive libraries.

---

## jQuery Replacement Utilities (Addon)

### Concept

Provide common DOM utilities for developers migrating from jQuery.

```javascript
import { $, addClass, fadeIn } from 'lume-js/addons/dom';

const el = $('.my-button');
addClass(el, 'active');
fadeIn(el, 300);
```

### Included Functions (~800B total)

- `$(selector)` — Query shorthand
- `addClass/removeClass/toggleClass`
- `fadeIn/fadeOut`
- `slideUp/slideDown`
- `on/off` — Event helpers

**NOT included:** Ajax (use fetch), complex animations (use CSS/WAAPI)

---

## Future Addons Roadmap

### Near-term (v2.x)

| Addon | Purpose | Est. Size |
|-------|---------|-----------|
| Form validation | Declarative validation rules | ~1KB |
| Persistence | localStorage/sessionStorage sync | ~500B |
| History/Undo | Undo/redo via state snapshots | ~800B |
| Debug | Browser console integration | ~1KB |

### Mid-term (v3.0)

| Addon | Purpose | Est. Size |
|-------|---------|-----------|
| Web Worker | Reactive worker message passing | ~600B |
| Canvas | Reactive canvas rendering | ~1KB |
| Network | Online/offline state | ~600B |
| Reactive Arrays | Array mutation helpers | ~400B |

### Long-term (v3.0+)

| Feature | Purpose | Notes |
|---------|---------|-------|
| **TC39 Signals** | Interop with future standard | Wait for Stage 3+ |
| **Edge Database** | Sync with Turso/D1/PlanetScale | Wait for API stabilization |
| **Reactive CSS** | Bind to CSS custom properties | Wait for Houdini support |

---

## Web Components Registry (Future)

### Concept

Pre-built reactive web components: `@lume-components/*`

```html
<lume-datepicker bind="startDate"></lume-datepicker>
<lume-autocomplete source="cities" bind="selectedCity"></lume-autocomplete>
```

### Potential Components

- `lume-datepicker`
- `lume-autocomplete`
- `lume-rich-editor`
- `lume-data-grid`
- `lume-color-picker`
- `lume-file-upload`

**Architecture:** Each component uses Lume internally, exposes `bind` attributes for parent state.

---

## Addon Independence Principle

> **Critical Rule:** No addon should depend on another addon.

### Allowed Dependencies

```
addon → core (state.js, bindDom.js)
addon → standard browser APIs
```

### Not Allowed

```
addon → addon
addon → shared global state
addon → external npm packages (unless peer dep)
```

### Rationale

- Users can tree-shake any combination
- No hidden dependency chains
- Predictable bundle sizes

**If an addon needs effect-like behavior, reimplement it.**

---

## Might Add Later (If Demand)

- Array-based checkbox bindings
- `contenteditable` support with cursor handling
- Debounced input binding option
- Router addon (History API based)

---

## Versioning Strategy

### Principles

1. **Backward compatible** within major version
2. **Deprecation warnings** for 2 major versions before removal
3. **Clear version story** — v1 = stable core, v2 = plugin system + performance

### Current Versions

- **v1.0.0** — Stable, production-ready
- **v2.0.0-alpha.1** — Plugin system, experimental features

---

## Success Metrics

### Technical

- Bundle size <2KB core
- 100% test coverage maintained
- Works in Chrome, Firefox, Safari, Edge latest 2 versions

### Ecosystem

- 5+ official addon packages
- 50+ documentation pages
- Framework adapters for top 5 frameworks

### Developer Experience

- Setup to first component <5 minutes
- Basic tutorial completion <30 minutes
- One-line integration for major frameworks

---

## Notes & Ideas Log

*Add dated notes below as ideas evolve.*

### 2026-01-11
- Consolidated all archive documents into this vision
- Event delegation: built-in for performance, plugin system for extensions
- spaMode option acceptable for full SPA support
- Bundle transparency is nice-to-have, not urgent
- State-only core makes library universal (Node.js, Deno, browser)

### 2026-01-21
- Implemented `data-hidden`, `data-class`, `data-disabled` handlers in bindDom
- Initially built dynamic `data-{attr}` pattern (any HTML attr), but rolled back due to performance concerns
- **Future goal:** Dynamic `data-{attr}` with optimized approach (benchmark `el.dataset` vs explicit selectors)
- Explored central algorithm concept for state/bindDom/effect/repeat
- Size comparison: Core 2.35KB, Addons (no debug) 1.67KB, Total ~4KB (competitive with Preact's 4KB)

### 2025-12-19
- Plugin system implemented in v2-alpha.1
- 5 lifecycle hooks: onInit, onGet, onSet, onSubscribe, onNotify
- effect move to addon paused due to issues

### 2025-12-16
- Deep analysis of Solid.js performance advantages
- Identified 50x gap in list rendering (keyed diffing needed)
- Confirmed proxy overhead is unavoidable trade-off for syntax

---

## Future: Dynamic data-{attr} Pattern

> **Added:** 2026-01-21  
> **Status:** Deferred — needs benchmark before implementation

### Concept

Any HTML attribute made reactive via `data-{attr}` prefix:

```html
<div data-hidden="isHidden">           <!-- hidden attr -->
<div data-disabled="isDisabled">       <!-- disabled attr -->
<div data-aria-expanded="isOpen">      <!-- aria-expanded -->
<a data-href="dynamicUrl">             <!-- href attr -->
```

### Why Deferred

Current implementation scans all attributes on all elements (`O(n × m)`), which is slow for large DOMs:

```js
// Slow: O(n × m)
for (const el of root.querySelectorAll('*')) {
  for (const attr of el.attributes) { ... }
}
```

### Faster Approaches to Benchmark

1. **`el.dataset` API** — Already filtered to `data-*` only
2. **Early bailout** — Skip elements with no matching attrs
3. **Specific selectors** — Query `[data-hidden], [data-class]` explicitly

### Success Criteria

- Benchmark 10,000 element DOM
- Must be within 2x of explicit selector approach
- No perceptible delay on bind

---

## Data-* Handler Design Questions

> **Added:** 2026-01-21  
> **Status:** Open — needs design decisions before v2

These questions must be answered before finalizing the data-* handler implementation.

### 1. `data-class` — Multiple Class Handling

**Question:** What if user has existing classes and wants to add/remove one?

| Approach | Example | Behavior |
|----------|---------|----------|
| Replace all | `<div class="foo bar" data-class="theme">` | Sets class to just "theme", loses "foo bar" |
| Append | Same | Adds "theme" to "foo bar" → "foo bar theme" |
| Toggle specific | `data-class-active="isActive"` | Adds/removes "active" only |

**Current behavior:** Replace all (simple but destructive)

**Alternatives to consider:**
```html
<!-- Option A: Single class toggle -->
<div data-class-active="isActive">  <!-- toggles 'active' class only -->

<!-- Option B: classList helper -->
<div data-classlist="theme">  <!-- appends, doesn't replace -->

<!-- Option C: Merge syntax -->
<div class="foo bar" data-class="+theme">  <!-- '+' means append -->
```

### 2. `data-hidden` — Remove vs Hide

**Question:** Should hidden mean `display: none` or remove from DOM?

| Approach | Pros | Cons |
|----------|------|------|
| `display: none` | Element exists, preserves state, fast | Takes memory, still in tab order |
| `el.hidden = true` | Semantic HTML, respects CSS | Can be overridden by CSS |
| Remove from DOM | Cleaner, less memory | Loses state, slow to re-add |
| Comment placeholder | Track position for re-insert | Complex implementation |

**Current behavior:** Sets `hidden` attribute (boolean toggle)

**Related patterns:**
- Vue: `v-show` (display) vs `v-if` (remove)
- Alpine: `x-show` (display) vs `x-if` (remove)
- React: Conditional rendering (remove)

**Decision needed:** Should Lume have both patterns (`data-hidden` vs `data-if`)?

### 3. Initial State — Create on Load or on Toggle?

**Question:** If element starts hidden, when is it created?

```html
<!-- Is this rendered immediately or only when isVisible becomes true? -->
<div data-hidden="!isVisible">
  <expensive-component></expensive-component>
</div>
```

**Options:**
1. Always render, just hide → Simple, but wastes resources
2. Lazy render → Complex, needs template system
3. User controls via markup → Let user decide

### 4. Modals/Popovers — Animation & Content Swap

**Question:** How do animations work with reactive visibility?

```html
<!-- User wants: close modal with fade, swap content, reopen with fade -->
<div class="modal" data-hidden="!isModalOpen">
  <div data-bind="modalContent"></div>
</div>
```

**Challenges:**
- CSS transitions need time before `display: none`
- Content swap during animation breaks layout
- Multiple modals with shared state

**Potential solutions:**
```js
// Option A: Transition helper
import { transition } from 'lume-js/addons';
transition(el, 'opacity', { duration: 300 });

// Option B: data-transition attribute
<div data-hidden="!isOpen" data-transition="fade">

// Option C: Let user handle with CSS
<div style="transition: opacity 0.3s" data-hidden="!isOpen">
```

### 5. Popular Attrs — Priority List

**Must work correctly (high usage):**
- `hidden` — visibility toggle
- `disabled` — form controls
- `class` — styling
- `value` / `checked` — form inputs
- `aria-*` — accessibility

**Should work (common usage):**
- `href` / `src` — dynamic URLs
- `title` — tooltips
- `placeholder` — form hints
- `style` — inline styles (careful!)

**Nice to have (less common):**
- `contenteditable`
- `tabindex`
- `draggable`
- `data-*` (recursive? 🤔)

### 6. Override Mechanism

**Question:** How can users customize handler behavior?

```js
// Option A: Per-binding options
<div data-hidden="isHidden" data-hidden-mode="remove">

// Option B: Global config
bindDom(root, store, {
  handlers: {
    hidden: (el, val) => val ? el.remove() : parent.append(el)
  }
});

// Option C: Register custom handlers
registerDataHandler('data-fade', (el, store, key) => {
  // Custom fade implementation
});
```

### Decision Log

| Question | Status | Decision |
|----------|--------|----------|
| Multi-class | Open | — |
| Hide vs Remove | Open | — |
| Initial state | Open | — |
| Animations | Open | — |
| Priority attrs | Open | — |
| Override | Open | — |


---

## Idea: Central Subscription Algorithm

> **Added:** 2026-01-21  
> **Status:** Exploratory — needs design

### The Preact Observation

Preact routes everything through one central diff algorithm. This enables:
- Shared code paths (smaller bundle)
- Single optimization point
- Unified lifecycle

### Similarity to Node.js Event Loop

This pattern is similar to Node.js event loop architecture:

```
Node.js Event Loop                 Lume Central Hub (proposed)
┌──────────────────────┐           ┌──────────────────────┐
│     Event Loop       │           │   Subscription Hub   │
│  (single-threaded)   │           │  (central registry)  │
└─────────┬────────────┘           └─────────┬────────────┘
          │                                  │
   ┌──────┴──────┐                    ┌──────┴──────┐
   ▼             ▼                    ▼             ▼
Timers       I/O callbacks        effect()      bindDom
   ▼             ▼                    ▼             ▼
setImmediate  fs, net            repeat()     computed()
```

**Key parallels:**
- Single queue for all events/subscriptions
- Batched processing (microtask-like)
- Deterministic ordering
- Centralized cleanup

### Current Architecture (Independent)

```js
// Each module manages its own subscriptions
state.js   → listeners Map per store
effect.js  → subscribes directly to state
bindDom.js → subscribes directly to state
repeat.js  → subscribes directly to state
```

### Proposed Architecture (Unified Hub)

```js
// Central hub manages all subscriptions
const hub = {
  subscriptions: new Map(),  // storeId+key → Set<callbacks>
  pending: new Set(),        // batched notifications
  
  subscribe(store, key, callback) { ... },
  notify(store, key, value) { ... },
  flush() { ... }  // Process all pending in one loop
};
```

### Implementation Ideas

#### 1. Shared Subscription Registry

```js
// Central registry (WeakMap for GC)
const registry = new WeakMap();

function getSubscribers(store) {
  if (!registry.has(store)) {
    registry.set(store, new Map());
  }
  return registry.get(store);
}
```

#### 2. Unified Batching

```js
// All state changes batch together across stores
storeA.count = 1;
storeB.name = 'test';
storeC.items = [];
// → Single microtask, single flush, all subscribers notified together
```

#### 3. Priority Levels (like event loop phases)

```js
const PRIORITY = {
  SYNC: 0,      // Immediate (computed values)
  EFFECT: 1,    // Effects run after sync
  DOM: 2,       // DOM updates after effects
  IDLE: 3       // Low-priority (analytics, logging)
};
```

#### 4. Central Cleanup

```js
// One function cleans up everything
function disposeStore(store) {
  registry.delete(store);
  // All effects, bindings, repeats automatically cleaned
}
```

### Benefits if Unified

1. **Single notify loop** — One optimized path for all updates
2. **Shared batching** — All subscriptions batch together
3. **Central cache** — Remember element→key mappings
4. **Smaller combined size** — Shared code between modules (~20-30% reduction potential)
5. **Easier debugging** — One place to inspect all subscriptions
6. **Simpler cleanup** — One registry to clear

### Challenges

1. **Coupling** — Modules become dependent on central hub
2. **Complexity** — More code in core (but shared across modules)
3. **Tree-shaking** — Can't remove unused parts as easily
4. **Migration** — Breaking change to internal architecture

### Related Patterns to Study

| Pattern | Where Used | Relevance |
|---------|-----------|-----------|
| Event Loop | Node.js, Browser | Single queue, phased processing |
| Redux Store | Redux | Centralized state, single dispatch |
| RxJS Subject | RxJS | Central observable, multiple subscribers |
| Signals | Solid, Preact | Fine-grained, but unified notification |
| Vuex/Pinia | Vue | Centralized mutations |

### Open Questions

- [ ] What would the central hub API look like?
- [ ] Can modules stay independent but share notification mechanism?
- [ ] How would priority scheduling work?
- [ ] Would this break current plugin hooks?
- [ ] Is the complexity worth the size savings?

### Prototyping Steps

1. Benchmark current multi-subscription overhead
2. Create minimal hub prototype (separate branch)
3. Migrate one module (effect.js) to use hub
4. Measure size and performance impact
5. Decide go/no-go based on data

### Alternative: Shared Utilities Without Full Hub

Instead of full centralization, extract shared patterns:

```js
// Shared utilities (smaller scope)
export function createBatcher() { ... }
export function createSubscriptionMap() { ... }
export function createCleanupRegistry() { ... }
```

Each module uses shared utilities but remains independent.

