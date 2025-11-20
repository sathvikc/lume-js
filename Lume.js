Lume.js Core Library Improvements
Staying True to Philosophy: Standards-Only, Minimal, No Framework Tax
Current State Analysis
Total Core Lines: ~576 lines (state: 159, effect: 104, bindDom: 128, computed: 136, watch: 13, utils: 41)
Philosophy: Standards-only, Go-style minimalism, <2KB gzipped, no artificial limitations

Recommended Improvements (Aligned with Philosophy)
1. Add Granular DOM Binding Helpers ⭐⭐⭐⭐⭐
Problem: bindDom only supports value/text binding, not classes/attributes/styles
Impact: Users forced to write manual effects (as seen in form-heavy example)

Add to bindDom.js (+40 lines):
// Support multiple binding types with data-bind-{type}
// data-bind-class="active: isActive"
// data-bind-attr="disabled: isDisabled"  
// data-bind-style="color: themeColor"

function bindClasses(el, store, expression) {
  // Parse "className: path.to.value"
  // Auto-subscribe and toggle classes
}

function bindAttributes(el, store, expression) {
  // Parse "attrName: path.to.value"
  // Auto-subscribe and set attributes
}

function bindStyles(el, store, expression) {
  // Parse "property: path.to.value"
  // Auto-subscribe and update inline styles
}

Benefits:

✅ Still standards-only (data-* attributes)
✅ Eliminates ~100 lines from form-heavy example
✅ More declarative than manual effects
✅ ~40 lines to core, saves 100+ in apps
Philosophy Check: ✅ Uses standard data-*, no custom syntax

2. Add setPath Utility for Deep Updates ⭐⭐⭐⭐
Problem: No helper to set nested values programmatically
Current: Users must manually traverse: store.user.profile.name = value

Add to utils.js (+15 lines):
export function setPath(obj, pathString, value) {
  const keys = pathString.split('.');
  const lastKey = keys.pop();
  const target = resolvePath(obj, keys);
  target[lastKey] = value;
}

// Usage:
setPath(store, 'user.profile.name', 'Alice');

Benefits:

✅ Enables validation rules object to work better
✅ Cleaner programmatic state updates
✅ Only 15 lines
Philosophy Check: ✅ Standard JavaScript, no magic

3. Add batch() Helper to Core ⭐⭐⭐⭐
Problem: Multiple synchronous updates trigger multiple effect runs
Current: Per-state batching via microtasks, but no manual control

Add to state.js (+20 lines):
export function batch(fn) {
  const originalQueueMicrotask = globalThis.queueMicrotask;
  let batchedFlushes = [];
  
  // Defer all flushes
  globalThis.queueMicrotask = (fn) => {
    batchedFlushes.push(fn);
  };
  
  try {
    fn();
  } finally {
    globalThis.queueMicrotask = originalQueueMicrotask;
    // Run all flushes at once
    batchedFlushes.forEach(flush => flush());
  }
}

// Usage:
batch(() => {
  store1.count = 5;
  store2.name = 'Alice';
  store3.theme = 'dark';
  // All effects run once after this block
});

Benefits:

✅ User control over batching
✅ Performance for bulk updates
✅ ~20 lines
Philosophy Check: ✅ Explicit, no magic

4. Array Reactivity Support ⭐⭐⭐⭐⭐
Problem: Arrays aren't reactive currently (throws error)
Major limitation for todo lists, data tables, etc.

Extend state.js (+60 lines):
export function state(obj) {
  if (Array.isArray(obj)) {
    return createReactiveArray(obj);
  }
  // ... existing object code
}

function createReactiveArray(arr) {
  const listeners = { length: [], items: [] };
  
  const proxy = new Proxy(arr, {
    get(target, key) {
      // Track array access for effects
      if (key === 'length' || !isNaN(key)) {
        // Register dependency
      }
      
      // Intercept mutating methods
      if (typeof target[key] === 'function') {
        const original = target[key];
        return function(...args) {
          const result = original.apply(target, args);
          // Notify on mutation (push, pop, splice, etc.)
          notifyListeners();
          return result;
        };
      }
      
      return target[key];
    },
    
    set(target, key, value) {
      target[key] = value;
      notifyListeners();
      return true;
    }
  });
  
  return proxy;
}

Benefits:

✅ Critical for many apps (todos, lists, tables)
✅ Still standard JavaScript arrays
✅ ~60 lines for full array support
Philosophy Check: ✅ Standard arrays, no custom collection types

5. Add onMount Lifecycle Helper ⭐⭐⭐
Problem: Effects run before DOM exists (timing issues)
Current workaround: setTimeout or manual checks

Add to effect.js (+15 lines):
export function onMount(fn) {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', fn);
  } else {
    fn();
  }
}

// Usage:
onMount(() => {
  effect(() => {
    // Safe - DOM guaranteed to exist
    document.getElementById('myEl').textContent = store.count;
  });
});

Benefits:

✅ Eliminates timing bugs
✅ More explicit than inline checks
✅ Only 15 lines
Philosophy Check: ✅ Standard DOM API wrapper


7. Better Error Messages ⭐⭐⭐⭐
Problem: Generic error messages make debugging harder

Improvements (+0 lines, just better text):
// Current:
throw new Error('state() requires a plain object');

// Better:
throw new Error('[Lume.js state] Received ${typeof obj}, expected plain object. Arrays require state.array()');

// Current:
throw new Error('effect() requires a function');

// Better:
throw new Error('[Lume.js effect] Received ${typeof fn}, expected function. Did you forget () => { }?');

Benefits:

✅ Better DX
✅ Clearer solutions
✅ No size impact
Philosophy Check: ✅ Just better messaging

8. Add isReactive Helper ⭐⭐
Problem: No way to check if something is a reactive proxy

Add to state.js (+8 lines):
const REACTIVE_MARKER = Symbol('__LUME_REACTIVE__');

// In state() function:
proxy[REACTIVE_MARKER] = true;

// Export:
export function isReactive(obj) {
  return obj && obj[REACTIVE_MARKER] === true;
}

Benefits:

✅ Debugging helper
✅ Conditional logic
✅ Only 8 lines
Philosophy Check: ✅ Simple utility

Summary: Recommended Priority
Priority	Feature	Lines Added	Impact	Philosophy
P0	Array reactivity	+60	🔥 Critical	✅ Standard arrays
P1	Granular DOM binding	+40	🔥 Huge DX	✅ data-* attributes
P1	setPath utility	+15	⭐ Very useful	✅ Standard JS
P2	debounce/throttle	+30	⭐ Common need	✅ Standard patterns
P2	batch() helper	+20	⭐ Performance	✅ Explicit control
P3	onMount lifecycle	+15	⭐ DX improvement	✅ DOM API wrapper
P3	Better errors	+0	⭐ DX improvement	✅ Just text
P4	isReactive helper	+8	📌 Nice to have	✅ Simple utility
Total Added: ~188 lines
New Total: ~764 lines (still well under 1000 for full core + addons)
Bundle Impact: Still <2KB gzipped ✅

What NOT to Add (Violates Philosophy)
❌ JSX/Template Syntax - Breaks standards-only
❌ Virtual DOM - Adds complexity, breaks simplicity
❌ Routing - Outside scope, use existing
❌ HTTP Client - Use fetch/axios
❌ Component System - Use Web Components
❌ CSS-in-JS - Not our concern
❌ TypeScript Runtime - Build tool dependency
❌ Signal Syntax - New API to learn

Key Insight
The biggest improvement would be array reactivity + granular DOM bindings. These two alone would:

Eliminate ~150 lines from typical apps
Make Lume.js viable for 80% more use cases (lists, tables, dynamic UIs)
Still stay 100% true to standards-only philosophy
Keep bundle under 2KB
The form-heavy example highlights the pain points perfectly - lots of manual effect() calls for things that should be declarative bindings.