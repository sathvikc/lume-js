# V2 Stable — Next Steps & Research

> **Purpose:** Detailed plan for going from beta.1 → v2.0.0 stable release.  
> **Status:** Pre-implementation research. No code changes yet.  
> **Date:** 2026-03-04

---

## Table of Contents

1. [Current State Assessment](#current-state-assessment)
2. [Open Design Decisions](#open-design-decisions)
3. [Core Stripping Plan](#core-stripping-plan)
4. [SSR & Hydration Strategy](#ssr--hydration-strategy)
5. [Re-init & Dispose Pattern](#re-init--dispose-pattern)
6. [Effect Auto-tracking Analysis](#effect-auto-tracking-analysis)
7. [State ↔ Effect Decoupling](#state--effect-decoupling)
8. [Packaging & Minification](#packaging--minification)
9. [Implementation Order](#implementation-order)

---

## 1. Current State Assessment

### Core Size Breakdown (v2.0.0-beta.1)

| File | Gzipped | % of Total | Role |
|------|---------|-----------|------|
| `core/bindDom.js` | 1.00 KB | 42% | DOM binding, handler system, event delegation, two-way binding |
| `core/state.js` | 0.79 KB | 33% | Proxy, $subscribe, batching, plugin system, effect tracking |
| `core/effect.js` | 0.39 KB | 16% | Auto-tracking + explicit deps modes |
| `core/utils.js` | 0.22 KB | 9% | `resolvePath()` for nested paths |
| **Total** | **2.39 KB** | **100%** | |

### What's Working Well
- 272 tests, 100% coverage across all metrics
- Handler system is clean and composable  
- `data-*` attribute contract is solid
- Addons are properly separated (computed, watch, repeat, debug)
- TypeScript definitions are complete
- Zero dependencies

### Known Issues
- Plugin system is in core but only used by debug addon
- `isReactive()` is in core but is a utility
- `utils.js` is a separate module for one function
- Package ships unminified source
- State and effect are coupled via `globalThis.__LUME_CURRENT_EFFECT__`

---

## 2. Open Design Decisions

### 2.1 `$subscribe` — Confirmed ✅

**Decision: Keep `$subscribe`.**

- "Subscribe" is the standard term for pub/sub pattern
- `$on` is too generic (on what?)
- `$watch` conflicts with the watch addon
- `$listen` implies events, not state changes
- The `$` prefix clearly marks it as a meta-method, not a data property

### 2.2 `bindDom` — Confirmed ✅

**Decision: Keep `bindDom`.**

- It literally binds DOM to state — the name describes the action
- `bind` is too generic (bind what?)
- `mount` implies lifecycle (React/Vue baggage)
- `connect` implies networking

### 2.3 Effect Auto-tracking vs Explicit Deps

**Decision: NEEDS RESEARCH (see [section 6](#effect-auto-tracking-analysis))**

Current API:
```javascript
// Auto-tracking (default — no deps argument)
effect(() => {
  document.title = `Count: ${store.count}`;
});

// Explicit deps (deps argument provided)
effect(() => {
  analytics.log(store.count);
}, [[store, 'count']]);
```

The question: Should the arg order or mode selection be different?

### 2.4 Cleanup/Dispose Pattern

**Decision: NEEDS RESEARCH (see [section 5](#re-init--dispose-pattern))**

Current: All cleanup functions are bare functions returned from API calls:
```javascript
const cleanup = bindDom(root, store);
const cleanup = effect(() => { ... });
const unsub = store.$subscribe('key', fn);
```

Question: Should there be a unified `.dispose()` pattern?

---

## 3. Core Stripping Plan

### 3.1 Move Plugin System to Addon (~150-200B savings)

**What moves out of `state.js`:**
- `options.plugins` parameter handling
- `hasPlugins` fast-path flag
- `onInit` call loop
- `onGet` hook in Proxy get trap (5 lines + try/catch)
- `onSet` hook in Proxy set trap (5 lines + try/catch)  
- `onNotify` hook in `scheduleFlush` (4 lines + try/catch)
- `onSubscribe` hook in `$subscribe` (4 lines + try/catch)

**How it would work as an addon:**

Option A: **Wrapper Proxy** (recommended)
```javascript
// In lume-js/addons
import { state } from 'lume-js';

export function withPlugins(store, plugins) {
  // Wrap the existing proxy in a second Proxy
  // that intercepts get/set and calls plugin hooks
  return new Proxy(store, {
    get(target, key) {
      let value = target[key];
      for (const p of plugins) {
        const r = p.onGet?.(key, value);
        if (r !== undefined) value = r;
      }
      return value;
    },
    set(target, key, value) {
      let newValue = value;
      for (const p of plugins) {
        const r = p.onSet?.(key, newValue, target[key]);
        if (r !== undefined) newValue = r;
      }
      target[key] = newValue;
      return true;
    }
  });
}
```

Usage change:
```javascript
// Before (beta.1)
const store = state({ count: 0 }, { plugins: [createDebugPlugin()] });

// After (v2 stable)
import { withPlugins } from 'lume-js/addons';
const store = withPlugins(state({ count: 0 }), [createDebugPlugin()]);
```

Option B: **Hook registration on state**
```javascript
// state.js exposes a hook registration point
export function __registerPlugin(store, plugin) { ... }
```

**Recommendation:** Option A. It's cleaner, doesn't pollute core, and the double-Proxy overhead only applies to stores that opt into debugging — which is a dev-only concern.

**Backward compat impact:** Breaks `state(obj, { plugins: [...] })`. Acceptable because:
- Only the debug addon uses it
- No external users (published 4 days ago as beta)
- Debug is a dev tool, not production code
- Migration is a 1-line change

### 3.2 Move `isReactive()` to Addons (~30-40B savings)

```javascript
// Currently in state.js, exported from index.js
export function isReactive(obj) {
  return !!(obj && typeof obj === 'object' && obj[REACTIVE_MARKER]);
}
```

**Issue:** `REACTIVE_MARKER` is a closure-scoped `Symbol` in `state.js`. Moving `isReactive` requires either:
1. Exporting the symbol (exposes internal)
2. Using a different detection method

**Detection alternative:** Check for `$subscribe` function presence:
```javascript
// In addons
export function isReactive(obj) {
  return !!(obj && typeof obj === 'object' && typeof obj.$subscribe === 'function');
}
```

This is duck-typing, not marker-based. It's slightly less precise (any object with `$subscribe` would pass), but in practice, only Lume proxies have `$subscribe`. The REACTIVE_MARKER was already overkill.

**Backward compat impact:** Import path changes from `'lume-js'` to `'lume-js/addons'`. Acceptable for beta.

### 3.3 Inline `resolvePath` into `bindDom.js` (~50-80B savings)

Current `utils.js` (40 lines) has one export used by one consumer (`bindDom.js`).

**Simplified inline version:**
```javascript
function resolvePath(obj, pathArr) {
  if (!pathArr?.length) return obj;
  let current = obj;
  for (const key of pathArr) {
    if (current == null || !(key in current))
      throw new Error(`Invalid path: "${pathArr.join('.')}"`);
    current = current[key];
  }
  return current;
}
```

**What changes:**
- Two separate error messages → one combined message
- The path is still shown in the error (developer can debug)
- `pathArr.slice(0, i+1).join('.')` (costly per-iteration) → `pathArr.join('.')` (once)
- Eliminates `utils.js` module and its import overhead

**Error message comparison:**
```
// Before (two separate errors)
Cannot access property "address" of null at path: user.address
Property "city" does not exist at path: user.address.city

// After (one error)
Invalid path: "user.address"
Invalid path: "user.address.city"
```

The developer still gets the exact path that failed. The distinction between "null target" and "missing key" is rarely useful — in both cases, the path is wrong.

**Backward compat impact:** None. Error message text is not part of the public API. The function is internal-only.

### 3.4 Shorten Error Strings in state.js (~50-80B savings)

Current error strings in `state.js` are verbose:
```javascript
console.error(`[Lume.js] Plugin "${p.name}" error in onInit:`, e);   // ×1
console.error(`[Lume.js] Plugin "${p.name}" error in onGet:`, e);    // ×1
console.error(`[Lume.js] Plugin "${p.name}" error in onSet:`, e);    // ×1
console.error(`[Lume.js] Plugin "${p.name}" error in onNotify:`, e); // ×1
console.error(`[Lume.js] Plugin "${p.name}" error in onSubscribe:`, e); // ×1
```

If plugins move to addon (3.1), all five disappear from core. Remaining core errors:
```javascript
throw new Error('state() requires a plain object');           // Keep as-is
throw new Error('Subscriber must be a function');             // Keep as-is
throw new Error('effect() requires a function');              // Keep as-is
throw new Error('bindDom() requires a valid HTMLElement as root'); // Keep
throw new Error('bindDom() requires a reactive state object');    // Keep
console.warn(`[Lume.js] Invalid path "${path}"`);            // Keep
console.warn(`[Lume.js] Target for "${path}" is not reactive`); // Keep
console.error('[Lume.js effect] Error in effect:', error);   // ×2 in effect.js
```

These are all clear and necessary. No further trimming needed if plugins are removed.

### 3.5 Projected Size After Stripping

| Change | Estimated Savings |
|--------|------------------|
| Remove plugin system from core | ~150-200B |
| Inline `resolvePath` + delete `utils.js` | ~80-100B |
| Move `isReactive` to addons | ~30-40B |
| **Total savings** | **~260-340B** |
| **Projected core size** | **~2.05-2.13 KB** |

Getting under 2KB would require the state↔effect decoupling (~100-150B more), which is higher risk. See [section 7](#state--effect-decoupling).

---

## 4. SSR & Hydration Strategy

### The Constraint

Lume has no build step, no compiler, no virtual DOM. SSR in the React/Next.js sense (render components on server → hydrate on client) doesn't apply.

### What Lume CAN Support

**Pre-rendered HTML + client-side binding (hydration-compatible):**

```html
<!-- Server renders static HTML with data-* attributes -->
<div id="app">
  <h1 data-bind="title">Welcome to My App</h1>
  <span data-bind="count">0</span>
  <button data-disabled="isLoading">Submit</button>
</div>

<script type="module">
  import { state, bindDom } from 'lume-js';
  
  // Client-side: bind to existing DOM
  const store = state({ title: 'Welcome to My App', count: 0, isLoading: false });
  bindDom(document.getElementById('app'), store);
  // Elements already have correct content — no flash
</script>
```

**This already works.** `bindDom` calls `$subscribe` which calls the callback immediately with the current value. If the server-rendered value matches the state, there's no visible change.

### What Needs Documentation (Not Code)

1. **Server → Client data passing:**
   ```html
   <!-- Server embeds initial state as JSON -->
   <script id="__LUME_DATA__" type="application/json">
     {"title": "Welcome", "count": 42}
   </script>
   
   <script type="module">
     const initialData = JSON.parse(document.getElementById('__LUME_DATA__').textContent);
     const store = state(initialData);
     bindDom(document.getElementById('app'), store);
   </script>
   ```

2. **SEO:** Content is in the HTML. Crawlers see it. No client-side rendering needed for content.

3. **Progressive enhancement:** If JavaScript fails, the HTML still has content. The page degrades gracefully.

### What Lume Should NOT Do

- Server-side rendering of JavaScript (that's Node.js's job, not Lume's)
- Virtual DOM diffing for hydration mismatch detection
- Hydration reconciliation algorithms
- Server components

### Possible Addon: `hydrateState()`

A convenience function that reads initial state from DOM:
```javascript
// In lume-js/addons
export function hydrateState(selector = '#__LUME_DATA__') {
  const el = document.querySelector(selector);
  if (!el) return {};
  try { return JSON.parse(el.textContent); }
  catch { return {}; }
}

// Usage
const store = state(hydrateState());
```

**Cost:** ~50 bytes. Could go in addons. Low priority — the JSON.parse pattern is simple enough to do manually.

---

## 5. Re-init & Dispose Pattern

### Current State

Cleanup is scattered across different return types:

```javascript
// bindDom returns cleanup function
const cleanup = bindDom(root, store);
cleanup(); // removes all subscriptions + event listeners

// effect returns cleanup function
const stop = effect(() => { ... });
stop(); // removes all subscriptions

// $subscribe returns unsubscribe function
const unsub = store.$subscribe('key', fn);
unsub(); // removes this one subscription

// computed addon has .dispose()
const doubled = computed(() => store.count * 2);
doubled.dispose(); // stops tracking

// repeat addon returns cleanup
const cleanup = repeat('#list', store, 'items', { ... });
cleanup(); // removes DOM + subscriptions
```

### The Problem

In a real app, you need to clean up everything when a "page" changes:

```javascript
// Current: manual tracking
const cleanups = [];
cleanups.push(bindDom(root, store));
cleanups.push(effect(() => { ... }));
cleanups.push(effect(() => { ... }));
cleanups.push(store.$subscribe('key', fn));
// Later:
cleanups.forEach(c => c());
```

### Option A: Scope/Collector Pattern

```javascript
import { scope } from 'lume-js';

const app = scope(() => {
  // All Lume calls inside this scope are tracked
  bindDom(root, store);
  effect(() => { ... });
  effect(() => { ... });
  store.$subscribe('key', fn);
});

// Dispose everything at once
app.dispose();

// Re-init: just call scope again
const app2 = scope(() => {
  bindDom(root, store);
  // ...
});
```

**Pros:** Clean, familiar (Vue's `effectScope`, SolidJS's `createRoot`)
**Cons:** Requires all core functions to detect scope context (magic / implicit). Adds complexity to core.

### Option B: Explicit Collector (No Magic)

```javascript
import { createCleanupGroup } from 'lume-js/addons';

const group = createCleanupGroup();
group.add(bindDom(root, store));
group.add(effect(() => { ... }));
group.add(store.$subscribe('key', fn));

// Dispose all
group.dispose();

// Re-init
const group2 = createCleanupGroup();
group2.add(bindDom(root, store));
```

**Pros:** No magic, no core changes, explicit, tiny addon (~30 bytes)
**Cons:** Verbose (`group.add(...)` on every call)

### Option C: Array-based (Zero Overhead) 

```javascript
// Just use an array — no library needed
const cleanups = [];
cleanups.push(bindDom(root, store));
cleanups.push(effect(() => { ... }));

// Dispose
while (cleanups.length) cleanups.pop()();

// Re-init: new array
const cleanups2 = [];
cleanups2.push(bindDom(root, store));
```

**Pros:** Zero library code, works today, idiomatic JavaScript
**Cons:** No `.dispose()` method, manual pop pattern

### Recommendation

**Option C (document the pattern) + Option B as an addon.**

The array pattern is good enough for most use cases and requires zero library code. For complex apps, `createCleanupGroup()` as an addon (~30 bytes) provides the `.dispose()` ergonomics.

Scope-based (Option A) violates "explicit over magic" — it requires hidden context detection, which is exactly the kind of implicit behavior that auto-tracking effects use. Since auto-tracking is already acknowledged as "magic," adding more magic goes against the philosophy direction.

### Re-initialization

`bindDom` already supports re-init naturally:

```javascript
let cleanup = bindDom(root, store);

// Re-init (e.g., after route change with new DOM)
cleanup();
cleanup = bindDom(root, store); // binds to new DOM
```

No special API needed. The cleanup function removes all subscriptions and event listeners. A new `bindDom` call scans the DOM fresh.

---

## 6. Effect Auto-tracking Analysis

### The Philosophy Conflict

The project values "explicit over magic." Auto-tracking is magic:

```javascript
// Auto-tracking: WHICH state properties trigger re-run?
// You have to mentally execute the function to know.
effect(() => {
  if (store.showName) {
    document.title = store.name;  // tracked only if showName is true
  }
});

// Explicit deps: CLEAR which properties trigger re-run
effect(() => {
  if (store.showName) {
    document.title = store.name;
  }
}, [[store, 'showName', 'name']]);
```

Auto-tracking has real problems:
1. **Conditional branches hide dependencies** — deps change based on runtime values
2. **Side effects during tracking** — logging, analytics, DOM reads happen during the "tracking" run
3. **Infinite loops** — read and write same store in one effect
4. **`globalThis` coupling** — state.js must know about effect.js via shared global

### The User Experience Conflict

But auto-tracking is *really nice* for simple cases:

```javascript
// This "just works" — the killer feature for newcomers
effect(() => {
  document.title = `Count: ${store.count}`;
});
```

Requiring explicit deps for this:
```javascript
// More verbose for the common case
effect(() => {
  document.title = `Count: ${store.count}`;
}, [[store, 'count']]);
```

### Options

**Option 1: Keep both, keep current order (recommended)**

```javascript
effect(fn)           // auto-tracking (simple cases)
effect(fn, deps)     // explicit deps (side-effects, complex)
```

Rationale: Auto-tracking is the "easy" mode. Explicit is the "precise" mode. The function has the same name. If you need precision, add deps. This is how `useEffect` works (React), how `watch` works (Vue), and how `createEffect` works (Solid). Users understand this pattern.

**Option 2: Separate functions**

```javascript
effect(fn)            // always auto-tracking
track(fn, deps)       // always explicit
```

Rationale: Each function does one thing. No overloading. But: now there are two names to learn, and the distinction is subtle.

**Option 3: Flip defaults (explicit-first)**

```javascript
effect(fn, deps)      // explicit deps required
effect.auto(fn)       // auto-tracking opt-in
```

Rationale: Makes the "safe" behavior the default. But: the common case becomes verbose. And `effect.auto()` is an unusual pattern.

**Option 4: Auto-tracking to addon**

```javascript
// Core: explicit only
import { effect } from 'lume-js';
effect(fn, [[store, 'count']]);

// Addon: auto-tracking
import { autoEffect } from 'lume-js/addons';
autoEffect(() => document.title = store.count);
```

Rationale: Clean separation. Core is "explicit only." Auto-tracking is opt-in magic.
Consequence: Decouples state↔effect (see section 7). Also saves ~100B from core.
**But:** Users who `import { effect } from 'lume-js'` and call `effect(() => ...)` without deps would silently stop auto-tracking. That's a breaking change that produces *no error* — the worst kind.

### Recommendation

**Keep Option 1 (current behavior).** The auto-tracking magic is already shipped and documented. Removing it or changing defaults creates a silent breaking change. The explicit deps API exists for users who want precision.

**Document the tradeoff clearly:**
- "Use `effect(fn)` for simple reactive rendering"
- "Use `effect(fn, deps)` for side-effects, analytics, or complex dependencies"
- "If your effect both reads and writes to the same store, always use explicit deps"

### Note on Arg Order

Current: `effect(fn, deps?)` — function first, deps second.

This is correct because:
- The function is always required (first)
- Deps are always optional (second)  
- Matches React's `useEffect(fn, deps?)` order
- Matches every other framework's ordering

No change needed.

---

## 7. State ↔ Effect Decoupling

### Current Coupling

```javascript
// effect.js sets this global during auto-tracking
globalThis.__LUME_CURRENT_EFFECT__ = effectContext;

// state.js checks this global in Proxy get trap
if (typeof globalThis.__LUME_CURRENT_EFFECT__ !== 'undefined') {
  // ... subscribe to changes for auto-tracking
}
```

This means `state.js` contains ~25 lines of effect-tracking logic. Effect and state are coupled at the source level.

### Decoupling Approach

```javascript
// state.js — expose a hook registration point
let getInterceptor = null;
export function __onGet(fn) { getInterceptor = fn; }

// In Proxy get trap (state.js):
if (getInterceptor) getInterceptor(listeners, key, pendingEffects);

// effect.js — register itself at import time
import { __onGet } from './state.js';
__onGet((listeners, key, pendingEffects) => {
  const ctx = globalThis.__LUME_CURRENT_EFFECT__;
  if (!ctx || ctx.tracking[key]) return;
  ctx.tracking[key] = true;
  // ... subscribe logic (currently in state.js)
});
```

### The Problem

The effect tracking code needs access to closure-scoped internals:
- `listeners` — the subscriber map
- `pendingEffects` — the Set for batched effect execution

These are **per-state-instance** variables. The hook would need to receive them as arguments, which means the `__onGet` hook is called on *every* property read with internal state exposed.

### Assessment

| Aspect | Impact |
|--------|--------|
| Size savings | ~100-150B gzipped |
| Complexity | Higher — indirection through hook registration |
| Performance | Negligible — one extra function call per get |
| Debuggability | Harder — tracking logic split across two files |
| Risk | Medium — must pass closure internals to external hook |

### Recommendation

**Defer this.** The savings (~100-150B) aren't enough to justify the complexity and risk for v2.0.0 stable. The coupling is internal (not visible to users) and works correctly.

If a future need arises (e.g., universal core without auto-tracking), it can be done in a minor version without any public API change.

---

## 8. Packaging & Minification

### Current State

The npm package ships **unminified source** in `src/`:

```json
"files": ["src", "README.md", "LICENSE"],
"exports": {
  ".": { "import": "./src/index.js" }
}
```

### What Needs to Change

1. **Build step for publishing** — Terser minification of `src/` → `dist/`
2. **Package exports point to `dist/`** — `"import": "./dist/index.js"`
3. **Source maps** — include `.map` files for debugging
4. **Keep `src/` in package** — for source map resolution and transparency

### Proposed Build Script

```javascript
// scripts/build.js
// 1. Minify src/core/*.js → dist/core/*.js
// 2. Minify src/addons/*.js → dist/addons/*.js  
// 3. Minify src/handlers/*.js → dist/handlers/*.js
// 4. Copy .d.ts files → dist/
// 5. Generate source maps
```

### Package.json Changes

```json
"exports": {
  ".": {
    "import": "./dist/index.js",
    "types": "./src/index.d.ts"
  },
  "./addons": {
    "import": "./dist/addons/index.js",
    "types": "./src/addons/index.d.ts"
  },
  "./handlers": {
    "import": "./dist/handlers/index.js",
    "types": "./src/handlers/index.d.ts"
  }
},
"files": ["dist", "src", "README.md", "LICENSE"]
```

### Single-File Bundle Option

In addition to the module structure, provide a single-file bundle:

```
dist/
  index.js              ← minified core (re-exports)
  core/
    state.js            ← minified
    effect.js           ← minified
    bindDom.js          ← minified
  addons/
    index.js            ← minified
    computed.js          ← minified
    ...
  handlers/
    index.js            ← minified
  lume.min.js           ← single-file bundle (core only, for CDN/script tag)
  lume.min.js.map       ← source map
```

The single-file `lume.min.js` is for CDN usage:
```html
<script type="module">
  import { state, bindDom, effect } from 'https://unpkg.com/lume-js/dist/lume.min.js';
</script>
```

---

## 9. Implementation Order

### Phase 1: Core Cleanup (size reduction)

1. Strip plugin system from `state.js`
2. Create `withPlugins()` wrapper in addons
3. Update `createDebugPlugin` to use `withPlugins()`
4. Move `isReactive()` to addons (duck-typing version)
5. Inline `resolvePath()` into `bindDom.js`, delete `utils.js`
6. Update all tests
7. Verify size ≤ 2.1KB

### Phase 2: Packaging

8. Create `scripts/build.js` (Terser minification)
9. Generate `dist/` with source maps
10. Create single-file `lume.min.js` bundle
11. Update `package.json` exports to point to `dist/`
12. Update `files` array
13. Test npm pack and verify

### Phase 3: Dispose & Re-init

14. Create `createCleanupGroup()` addon
15. Document the array-based cleanup pattern
16. Document re-init pattern (cleanup + re-bind)
17. Document SSR/hydration pattern (pre-rendered HTML + bindDom)

### Phase 4: Documentation Sync

18. Verify all docs match actual API
19. Update CHANGELOG for v2.0.0-beta.2 (or rc.1)
20. Update README with stability contract
21. Review and finalize `PROJECT-GOAL.md`

### Phase 5: Final Lockdown

22. Run core lockdown checklist (see `CORE-LOCKDOWN-CHECKLIST.md`)
23. Freeze API signatures
24. Tag v2.0.0 stable

---

## Parking Lot (Post-v2.0.0 Stable)

These are explicitly deferred. They can be added as addons or minor version features without breaking the core contract.

| Feature | When | Notes |
|---------|------|-------|
| Router addon | v2.1+ | History API based, simple pattern matching |
| `data-style` handler | v2.1+ | Security implications need careful design |
| Form validation addon | v2.2+ | Common need, but users can build it |
| `hydrateState()` addon | v2.1+ | Convenience, ~50 bytes |
| State↔effect decoupling | v2.x | Only if needed for specific use case |
| TC39 Signals integration | v3.0+ | Wait for spec to stabilize |
