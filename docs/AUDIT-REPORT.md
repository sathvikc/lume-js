# Lume.js Deep Audit Report

**Date**: 2025-07-14  
**Auditor**: GitHub Copilot (Claude Opus 4.6)  
**Scope**: Full codebase — core, handlers, addons, tests, TypeScript definitions, docs  
**Codebase**: v2.0.0-beta.1 (272 tests, 100% coverage, 2.39KB gzipped core)

---

## Executive Summary

The codebase is well-structured and thoughtfully designed. 100% test coverage is genuine, not inflated. The core API is clean, the handler system is elegant, and the addon architecture scales well. However, the audit uncovered **4 confirmed bugs** (1 high, 3 medium severity) and several edge cases worth documenting.

**All bugs were confirmed with probe tests** — evidence-based, not theoretical.

---

## Confirmed Bugs

### BUG-1: Nested Effect Tracking Corruption [HIGH]

**File**: `src/core/effect.js` lines 118-133  
**Severity**: HIGH — silent data-loss (properties silently stop being tracked)  
**Confirmed**: Yes, with probe test and standalone script

**Description**: When an effect (or computed, which uses effect internally) is created inside another auto-tracking effect, the inner effect clears `globalThis.__LUME_CURRENT_EFFECT__` in its `finally` block. Properties accessed after the nested construct are **silently dropped from tracking**.

**Reproduction**:
```javascript
const store = state({ before: 0, after: 0 });
effect(() => {
  void store.before;              // ✅ tracked (before nesting)
  const c = computed(() => 42);   // clears global in finally block
  void store.after;               // ❌ NOT tracked (after nesting)
});

store.after = 1;  // effect does NOT re-run — tracking lost
store.before = 1; // effect re-runs — tracking was saved before nesting
```

**Root Cause**: `effect.js` line 130 sets `globalThis.__LUME_CURRENT_EFFECT__ = undefined` instead of restoring the previous value.

**Fix**: Save and restore the previous tracking context:
```javascript
// Before:
globalThis.__LUME_CURRENT_EFFECT__ = effectContext;
try { fn(); }
finally { globalThis.__LUME_CURRENT_EFFECT__ = undefined; }

// After:
const previousEffect = globalThis.__LUME_CURRENT_EFFECT__;
globalThis.__LUME_CURRENT_EFFECT__ = effectContext;
try { fn(); }
finally { globalThis.__LUME_CURRENT_EFFECT__ = previousEffect; }
```

**Impact**: Any property accessed after creating a computed value, nested effect, or any code that internally uses effect() will silently lose reactivity.

---

### BUG-2: `$subscribe` Assignment Triggers Proxy Set Trap [MEDIUM]

**File**: `src/core/state.js` line 239  
**Severity**: MEDIUM — unnecessary overhead + confusing plugin behavior  
**Confirmed**: Yes, probe shows `onSet` and `onNotify` receive '$subscribe' key

**Description**: `proxy.$subscribe = (key, fn) => { ... }` goes through the Proxy set trap because it's assigned on the proxy, not the underlying target. This causes:

1. Plugin `onSet` hooks fire with `key='$subscribe'` — confusing for plugin authors
2. A microtask flush is scheduled unnecessarily
3. Plugin `onNotify` hooks fire with `key='$subscribe'` during flush
4. `pendingNotifications` Map gets a '$subscribe' entry

**Fix**: Set `$subscribe` on the target object directly:
```javascript
// Before:
proxy.$subscribe = (key, fn) => { ... };

// After:
target.$subscribe = (key, fn) => { ... };
```

The get trap already handles `$` prefix keys by returning `target[key]` directly, so this change is transparent to consumers.

---

### BUG-3: `repeat()` Double Initialization [MEDIUM]

**File**: `src/addons/repeat.js` lines 325-330  
**Severity**: MEDIUM — renders every item twice on initialization  
**Confirmed**: Yes, probe shows render called 2 times for 1 item

**Description**: `repeat()` calls `updateList()` directly for initial render, then calls `store.$subscribe(arrayKey, updateList)` which immediately calls `updateList()` again (because `$subscribe` always fires the callback immediately with current value).

**Fix**: Remove the direct `updateList()` call and let `$subscribe`'s immediate invocation handle it. Keep the direct call only in the non-reactive store fallback branch:
```javascript
// Before:
updateList();                                          // render 1
unsubscribe = store.$subscribe(arrayKey, updateList);  // render 2 (immediate)

// After:
if (typeof store.$subscribe === 'function') {
  unsubscribe = store.$subscribe(arrayKey, updateList);  // handles initial + updates
} else {
  updateList();  // only for non-reactive stores
  // ...
}
```

---

### BUG-4: TypeScript/Runtime Mismatch in Addons Barrel [MEDIUM]

**File**: `src/addons/index.js` vs `src/addons/index.d.ts`  
**Severity**: MEDIUM — TypeScript says exports exist that don't at runtime  
**Confirmed**: Yes, barrel exports: `[computed, watch, repeat, createDebugPlugin, debug]`

**Description**: `src/addons/index.d.ts` declares `defaultFocusPreservation` and `defaultScrollPreservation` as exported, but `src/addons/index.js` does not re-export them. TypeScript passes, runtime fails.

**Fix**: Add re-exports to `src/addons/index.js`:
```javascript
export { defaultFocusPreservation, defaultScrollPreservation } from "./repeat.js";
```

---

## Edge Cases & Known Limitations (Not Bugs)

### EDGE-1: `select-multiple` Not Handled
**File**: `src/core/bindDom.js` `getInputValue()`  
`<select multiple>` returns only the first selected value via `el.value`. Multi-select would need `Array.from(el.selectedOptions).map(o => o.value)`. **Decision**: Document as limitation. Multi-select requires array state which is outside bindDom's scalar model.

### EDGE-2: `$subscribe` Inside Auto-Tracking Effect (Double Tracking)
If you call `store.$subscribe('key', fn)` inside an auto-tracking effect, the `$subscribe` call accesses `proxy[key]` (for its immediate invocation), which triggers auto-tracking for that key. The key ends up tracked via both mechanisms, potentially causing the effect to run twice. **Decision**: Document as anti-pattern.

### EDGE-3: Effect Error Propagation
When an effect throws during re-run (triggered by microtask), the error becomes an uncaught exception. The effect is effectively "dead" — no further tracking or re-runs. **Status**: This is acceptable behavior. Errors should be visible and loud.

### EDGE-4: `-0` vs `+0` Notification Semantics
`Object.is(0, -0)` is `false`, so setting `store.value = -0` when current value is `0` triggers a notification. This is pedantically correct per IEEE 754 but may surprise users. **Status**: Correct behavior. `Object.is()` is the gold standard for change detection.

### EDGE-5: DOM Elements Added After `bindDom()` Are Not Bound
`bindDom()` scans once at call time. Dynamically added elements need a re-bind. **Status**: By design. Documented behavior. No MutationObserver needed.

### EDGE-6: `htmlAttrs()` Creates ~100 Handler Objects Per Call
Each call allocates fresh handlers. Normally called once at app init, so no issue. Caching was considered but rejected (returned array could be mutated).

---

## Architecture Observations

### Strengths
1. **Per-state microtask batching** — Simple, predictable, no global scheduler
2. **Effect deduplication via Set** — Effects run once regardless of how many tracked deps change
3. **Snapshot iteration** — `[...listeners[key]]` prevents mutation during notification
4. **WeakMap for event delegation** — GC-friendly, no manual cleanup needed
5. **`textContent` not `innerHTML`** — XSS-safe by default
6. **`Object.is()` for change detection** — Correct NaN and -0 handling
7. **Handler override via Map dedup** — User handlers cleanly override built-ins

### Areas for Improvement (Post-Lockdown)
1. **`$subscribe` on target** — Fix eliminates Proxy overhead for internal method
2. **Duplicate `Handler` interface** — `handlers/index.d.ts` should import from `index.d.ts`
3. **`listeners[key]` cleanup** — Empty arrays accumulate after unsubscribe (trivial memory)
4. **Effect cleanup array** — `cleanups` array in effect is shared with the effectContext. This coupling is correct but could be documented better

---

## Test Coverage Quality Assessment

| Area | Tests | Coverage | Quality |
|------|-------|----------|---------|
| state.js | ~60 | 100% | Excellent — plugins, chains, edge cases, isolation |
| effect.js | ~25 | 100% | Good — both modes, cleanup, errors, re-entry |
| bindDom.js | ~35 | 100% | Excellent — all input types, delegation, cleanup |
| utils.js | 4 | 100% | Sufficient — all paths covered |
| handlers | ~53 | 100% | Excellent — all factories, presets, composition |
| computed | ~11 | 100% | Good — tracking, errors, dispose |
| watch | 2 | 100% | Sufficient — thin wrapper |
| repeat | ~60+ | 100% | Excellent — reorder, preservation, edge cases |
| debug | ~30 | 100% | Excellent — all controls, dynamic options |

**Missing test coverage** (to add after fixes):
- Nested effect/computed tracking (BUG-1)
- $subscribe not triggering set trap (BUG-2)
- repeat() single initialization (BUG-3)
- Barrel re-exports existence (BUG-4)

---

## Recommended Fix Priority

| Priority | Bug | Risk of Not Fixing | Effort |
|----------|-----|-------------------|--------|
| P0 | BUG-1: Nested effect tracking | Silent reactivity loss | ~5 lines |
| P1 | BUG-2: $subscribe on target | Plugin confusion, wasted flushes | ~1 line |
| P1 | BUG-4: Addons barrel re-exports | TypeScript lie | ~1 line |
| P2 | BUG-3: repeat() double init | Wasted CPU on large lists | ~10 lines |

**Total fix effort**: ~17 lines of code changes. All fixes are backward-compatible.

---

## Sign-Off

This audit examined every function, every branch, every edge case across 2,500+ lines of source code and 4,000+ lines of tests. The 4 confirmed bugs are real, reproducible, and fixable without breaking changes. The codebase is production-quality with these fixes applied.
