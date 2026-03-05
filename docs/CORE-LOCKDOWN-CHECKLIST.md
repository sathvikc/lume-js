# Core Lockdown Checklist

> **Purpose:** Strict validation checklist before freezing the v2.0.0 stable API.  
> **Rule:** Every item must be checked and signed off before tagging v2.0.0.  
> **Date:** 2026-03-04

---

## How to Use This Checklist

- Go through **every item** in order
- Mark each with: ✅ (pass), ❌ (fail — must fix), or ⏭️ (N/A with justification)
- If any item under **MUST PASS** fails, do not release
- Items under **SHOULD PASS** can be deferred with documented justification
- Run the automated checks (`npm run validate`) as the final step

---

## Section 1: API Surface Audit

### 1.1 Public Exports

Verify that `src/index.js` exports exactly the intended public API. No more, no less.

- [ ] `state()` is exported
- [ ] `bindDom()` is exported
- [ ] `effect()` is exported
- [ ] `isReactive()` export location is intentional (core vs addon — decide)
- [ ] No accidental internal exports (check for leaked helpers, symbols, constants)
- [ ] Run: `node -e "import('lume-js').then(m => console.log(Object.keys(m)))"`

### 1.2 Function Signatures — "Will I Regret This in 5 Years?"

For each public function, verify:

**`state(obj, options?)`**
- [ ] First argument: plain object. What happens with `new Map()`, `null`, `undefined`, array, class instance?
- [ ] Second argument: optional. Missing or `{}` produces identical behavior to v1.0.
- [ ] Return type: Proxy with `$subscribe` method. Is `$subscribe` the final name?
- [ ] Does `state({})` work? (empty object)
- [ ] Does `state({ $subscribe: 'conflict' })` cause problems? ($ prefix collision)
- [ ] Are there any undocumented properties on the returned proxy?

**`proxy.$subscribe(key, fn)`**
- [ ] Calls `fn` immediately with current value — is this desired forever?
- [ ] Returns unsubscribe function — verified cleanup works
- [ ] What happens if `key` doesn't exist on the state? (should it warn? throw? silently work?)
- [ ] What happens if you subscribe to the same key twice with the same function?
- [ ] Does unsubscribe work if called multiple times? (idempotent?)

**`bindDom(root, store, options?)`**
- [ ] `root` must be HTMLElement — verified error for Document, DocumentFragment, string
- [ ] `store` must be reactive — verified error for plain object
- [ ] `options.handlers` accepts array — verified with empty, single, nested arrays
- [ ] `options.immediate` — verified behavior for both `true` and `false`
- [ ] Return type: cleanup function — verified removes all subscriptions + event listeners
- [ ] What happens if called twice on same root with same store? (duplicate bindings?)
- [ ] What happens if root has no matching `data-*` attributes? (should work silently)
- [ ] What happens if store key referenced in `data-*` doesn't exist?

**`effect(fn, deps?)`**
- [ ] `fn` must be a function — verified error for non-function
- [ ] No deps: auto-tracking mode — verified dependency collection works
- [ ] With deps: explicit mode — verified only specified deps trigger re-run
- [ ] Return type: cleanup function — verified stops all re-runs
- [ ] What happens if `fn` throws? (error propagation)
- [ ] What happens if effect reads and writes same key? (infinite loop?)
- [ ] What happens if cleanup is called during effect execution?
- [ ] Are there any timing issues with microtask batching?

### 1.3 Addon Exports

**`lume-js/addons`**
- [ ] `computed(fn)` — returns `{ value, subscribe, dispose }`
- [ ] `watch(store, key, fn)` — returns unsubscribe function
- [ ] `repeat(selector, store, key, options)` — returns cleanup function
- [ ] `createDebugPlugin(options)` — returns plugin object
- [ ] `debug` — global debug controller
- [ ] `defaultFocusPreservation` — exported utility
- [ ] `defaultScrollPreservation` — exported utility
- [ ] No accidental internal exports

**`lume-js/handlers`**
- [ ] `show` — handler object
- [ ] `boolAttr(name)` — factory function
- [ ] `ariaAttr(name)` — factory function
- [ ] `classToggle(...names)` — factory function (returns array)
- [ ] `stringAttr(name)` — factory function
- [ ] `formHandlers` — preset array
- [ ] `a11yHandlers` — preset array
- [ ] `htmlAttrs()` — preset function (returns array)
- [ ] No accidental internal exports
- [ ] Verify ARIA bool vs string distinction is correct

---

## Section 2: DOM Contract Audit

### 2.1 Built-in Attributes

For each built-in `data-*` attribute, verify:

**Boolean attributes:**
- [ ] `data-hidden="key"` → `el.hidden = Boolean(val)` — truthy hides, falsy shows
- [ ] `data-disabled="key"` → `el.disabled = Boolean(val)` 
- [ ] `data-checked="key"` → `el.checked = Boolean(val)` — works with checkbox + radio
- [ ] `data-required="key"` → `el.required = Boolean(val)`

**ARIA attributes:**
- [ ] `data-aria-expanded="key"` → `setAttribute('aria-expanded', 'true'/'false')`
- [ ] `data-aria-hidden="key"` → `setAttribute('aria-hidden', 'true'/'false')`

**Two-way binding:**
- [ ] `data-bind="key"` → text input: `el.value` ↔ `store.key`
- [ ] `data-bind="key"` → checkbox: `el.checked` ↔ `store.key` (boolean)
- [ ] `data-bind="key"` → radio: `el.checked = (el.value === String(store.key))`
- [ ] `data-bind="key"` → textarea: `el.value` ↔ `store.key`
- [ ] `data-bind="key"` → select: `el.value` ↔ `store.key`
- [ ] `data-bind="key"` → non-input elements: `el.textContent = store.key`
- [ ] `data-bind="nested.path"` → resolves nested state paths
- [ ] Event delegation: single `input` event listener on root element

### 2.2 Attribute Edge Cases

- [ ] Element with multiple `data-*` attributes (e.g., `data-bind` + `data-hidden`)
- [ ] Element with `data-*` attribute but key not in store (should warn, not crash)
- [ ] Element added to DOM after `bindDom()` call (not bound — expected behavior)
- [ ] `data-*` attribute with empty value (`data-bind=""`)
- [ ] `data-*` attribute on root element itself (should it be included in querySelectorAll?)

---

## Section 3: Behavioral Contract Audit

### 3.1 Reactivity

- [ ] Proxy set → batched microtask notification (not synchronous)
- [ ] Multiple writes to same key in one tick → only last value notified
- [ ] Multiple writes to different keys in one tick → all notified in one flush
- [ ] `Object.is()` comparison → NaN === NaN (no notification), -0 !== +0 (notification)
- [ ] Setting same value → no notification (no-op)

### 3.2 Subscription

- [ ] `$subscribe` calls immediately with current value
- [ ] Subsequent changes call via microtask batch
- [ ] Unsubscribe during notification callback — other subscribers still called
- [ ] Unsubscribe + resubscribe — works correctly
- [ ] Multiple subscribers for same key — all called

### 3.3 Effect

- [ ] Effect runs immediately on creation (both modes)
- [ ] Auto-tracking: accesses during execution are tracked
- [ ] Auto-tracking: dependencies re-collected on each run
- [ ] Explicit: only specified [store, key] deps trigger re-run
- [ ] Cleanup function stops all future re-runs
- [ ] Effect error propagation — error thrown, but effect is recoverable
- [ ] Re-entry guard — effect that triggers itself doesn't infinite loop

### 3.4 DOM Binding

- [ ] Cleanup removes all subscriptions
- [ ] Cleanup removes event delegation listener
- [ ] `DOMContentLoaded` auto-wait works (when `readyState === 'loading'`)
- [ ] `immediate: true` skips auto-wait
- [ ] Handler override: user handler with same `attr` replaces built-in
- [ ] Handler arrays auto-flattened

---

## Section 4: Size Audit

### MUST PASS

- [ ] Core size ≤ 2.10 KB gzipped (post-stripping target)
- [ ] Run: `node scripts/check-size.js`
- [ ] No files in `src/core/` are larger than 1.5KB gzipped individually

### SHOULD PASS

- [ ] Core size ≤ 2.00 KB gzipped (aspirational target)
- [ ] Handlers module adds ≤ 0.5KB gzipped
- [ ] No single addon file exceeds 1KB gzipped (excluding repeat.js)

### Size Breakdown Snapshot

Record actual measurements at lockdown time:

```
core/bindDom.js:   ____ B gzipped
core/effect.js:    ____ B gzipped
core/state.js:     ____ B gzipped
core/utils.js:     ____ B gzipped (or "deleted/inlined")
TOTAL:             ____ B gzipped
```

---

## Section 5: Test Coverage Audit

### MUST PASS

- [ ] All tests pass: `npm test`
- [ ] Coverage: 100% Statements
- [ ] Coverage: 100% Branches
- [ ] Coverage: 100% Functions
- [ ] Coverage: 100% Lines
- [ ] Run: `npm run coverage`

### Test Categories

- [ ] Core state tests cover all Proxy trap paths
- [ ] Core effect tests cover both auto-tracking and explicit deps
- [ ] Core bindDom tests cover all built-in attributes
- [ ] Handler tests cover all factory functions and presets
- [ ] Addon tests cover computed, watch, repeat, debug
- [ ] Edge case tests: null, undefined, empty string, 0, NaN, Symbol
- [ ] Error handling tests: invalid inputs, missing keys, non-reactive stores

---

## Section 6: TypeScript Audit

### MUST PASS

- [ ] `npm run typecheck` passes (zero errors)
- [ ] `src/index.d.ts` matches actual exports from `src/index.js`
- [ ] `src/addons/index.d.ts` matches actual exports from `src/addons/index.js`
- [ ] `src/handlers/index.d.ts` matches actual exports from `src/handlers/index.js`
- [ ] All public function parameters are typed
- [ ] All return types are specified
- [ ] `Plugin` interface matches actual plugin hooks (or removed if plugins move to addon)
- [ ] `Handler` interface matches actual handler contract
- [ ] Generic types work (e.g., `state<{ count: number }>({count: 0})`)

### SHOULD PASS

- [ ] No `any` types in public API surface
- [ ] JSDoc comments match TypeScript definitions

---

## Section 7: Documentation Audit

### MUST PASS

- [ ] README.md: Quick start example works when copy-pasted
- [ ] README.md: API section matches actual signatures
- [ ] README.md: Size claim matches actual measurement
- [ ] Every public function has a doc page in `docs/api/`
- [ ] No docs reference removed/renamed APIs
- [ ] CHANGELOG.md is up to date for the release version

### SHOULD PASS

- [ ] All examples in `examples/` directory work with `npm run dev`
- [ ] Tutorial docs (`docs/tutorials/`) are accurate
- [ ] Guide docs (`docs/guides/`) are accurate
- [ ] Design docs (`docs/design/`) are up to date
- [ ] GitHub Pages site is deployable and works

---

## Section 8: Package Audit

### MUST PASS

- [ ] `npm pack --dry-run` shows only intended files
- [ ] No test files in package
- [ ] No coverage directory in package
- [ ] No `.env`, secrets, or credentials in package
- [ ] `package.json` version is correct (no `-beta`, no `-alpha`)
- [ ] `package.json` exports are correct (pointing to minified dist or src)
- [ ] `package.json` type is `"module"`
- [ ] `package.json` sideEffects is `false`
- [ ] License file is included
- [ ] README is included

### SHOULD PASS

- [ ] Published package can be imported in a fresh project
- [ ] `import { state, bindDom, effect } from 'lume-js'` works
- [ ] `import { computed, watch } from 'lume-js/addons'` works
- [ ] `import { show, htmlAttrs } from 'lume-js/handlers'` works
- [ ] TypeScript intellisense works in VS Code with the published package

---

## Section 9: Backward Compatibility Audit

### MUST PASS — No Regressions from v1.0.0

These tests verify that code written for v1.0.0 works unchanged:

- [ ] `state({ count: 0 })` — no second arg needed
- [ ] `store.$subscribe('count', fn)` — same API
- [ ] `store.count = 5` — same reactivity
- [ ] `bindDom(root, store)` — no third arg needed
- [ ] `effect(() => { ... })` — no second arg needed
- [ ] `data-bind`, `data-hidden`, `data-disabled`, `data-checked`, `data-required` — all work
- [ ] `data-aria-expanded`, `data-aria-hidden` — both work
- [ ] Cleanup functions from all APIs work correctly
- [ ] Nested state paths (`data-bind="user.name"`) work

### MUST PASS — No Regressions from v2.0.0-beta.1

- [ ] Handler system works: `bindDom(root, store, { handlers: [...] })`
- [ ] All handler factories work: `show`, `boolAttr`, `ariaAttr`, `classToggle`, `stringAttr`
- [ ] Presets work: `formHandlers`, `a11yHandlers`, `htmlAttrs()`
- [ ] Effect explicit deps work: `effect(fn, [[store, 'key']])`
- [ ] Handler override works: user handler replaces built-in with same attr

---

## Section 10: Performance Audit

### SHOULD PASS

- [ ] 1000 state updates in rapid succession don't leak memory
- [ ] bindDom with 100 elements completes in <10ms
- [ ] Effect cleanup releases all references (no memory leak)
- [ ] $subscribe + unsubscribe cycle doesn't leak listeners
- [ ] Repeated bindDom/cleanup cycles don't leak event listeners

### Manual Checks

- [ ] Open browser DevTools → Memory → Take heap snapshot before and after 10,000 state updates
- [ ] Check that listener arrays don't grow unbounded after subscribe/unsubscribe cycles
- [ ] Verify microtask batching: 100 writes in one tick → 1 DOM update

---

## Section 11: Browser Compatibility

### MUST PASS

- [ ] Works in Chrome (latest)
- [ ] Works in Firefox (latest)
- [ ] Works in Safari (latest)
- [ ] Works in Edge (latest)

### SHOULD PASS

- [ ] Works in Chrome 80+ (Proxy support)
- [ ] Works in Safari 14+ (ES modules)
- [ ] Works without Node.js (pure browser, `<script type="module">`)
- [ ] Works with CDN import (`import ... from 'https://unpkg.com/lume-js/...'`)

---

## Section 12: Security Audit

### MUST PASS

- [ ] No `eval()` or `new Function()` in any source file
- [ ] No `innerHTML` assignments in core (only `textContent` in `updateElement`)
- [ ] No dynamic script creation
- [ ] No `document.write`
- [ ] State values are not injected as HTML (XSS safe)
- [ ] `data-bind` uses `textContent` for non-input elements (not `innerHTML`)

---

## Final Sign-off

```
Date:           ____________
Version:        ____________
Core Size:      ____________ KB gzipped
Total Tests:    ____________ passing
Coverage:       ____________ %
Checked by:     ____________

All MUST PASS items:  [ ] PASSED  [ ] FAILED

Decision:       [ ] SHIP IT  [ ] HOLD — fix items below

Items to fix:
1. ____________________________________________
2. ____________________________________________
3. ____________________________________________
```
