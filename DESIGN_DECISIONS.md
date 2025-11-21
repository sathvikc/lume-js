# Design Decisions

This document explains **why** Lume.js is designed the way it is. If you have suggestions for improvements, please open an issue with your reasoning!

---

## Core Philosophy

### Why "Standards-Only"?

**Decision:** Use only `data-*` attributes and standard JavaScript APIs.

**Reasoning:**
- HTML validators accept `data-*` attributes (HTML5 standard)
- Screen readers and accessibility tools work without special configuration
- No learning curve for HTML structure
- Works in environments where custom directives would break (WordPress, Shopify, email templates)
- Future-proof - won't break when framework trends change

**Alternatives considered:**
- ❌ Custom directives like `x-bind`, `v-model` → Breaks validation, harder accessibility
- ❌ JSX/Template literals → Requires build step, breaks progressive enhancement

---

## API Design

### Why Nested State Must Be Wrapped?

**Decision:** Require explicit `state()` wrapping for nested objects.

```javascript
// ✅ Required
const store = state({
  user: state({ name: 'Alice' })  // Must wrap
});

// ❌ Won't work
const store = state({
  user: { name: 'Alice' }  // Plain object, not reactive
});
```

**Reasoning:**
- **Explicit opt-in:** Clear which objects are reactive vs plain data
- **Performance:** Don't auto-wrap everything (could be expensive for large objects)
- **Predictability:** No magic - you control what's reactive
- **Clear ownership:** Each `state()` manages its own listeners and batching
- **Easier debugging:** Stack traces show exactly where reactivity was added

**Alternatives considered:**
- ❌ Auto-wrap nested objects → Hidden performance cost, unclear ownership
- ❌ Deep reactivity by default → Vue 3 moved away from this for performance reasons

**Tradeoff:** Slight verbosity for better explicitness and performance.

---

### Why Microtask Batching Instead of Synchronous Updates?

**Decision:** Batch updates in microtasks (per-state).

```javascript
store.count = 1;
store.count = 2;
store.count = 3;
// DOM updates ONCE with value 3 (after microtask)
```

**Reasoning:**
- **Performance:** Prevents excessive DOM updates (3 writes → 1 render)
- **Consistency:** All effects see the final state, not intermediate values
- **Standard behavior:** Matches Promise timing, feels natural to JS developers
- **Deduplication:** Multiple property changes trigger effects once

**Alternatives considered:**
- ❌ Synchronous updates → Too many DOM writes, poor performance
- ❌ RequestAnimationFrame → Delays updates unnecessarily, feels sluggish
- ❌ Global scheduler → Complex, harder to reason about cross-state timing

**Tradeoff:** Slight delay (1 microtask) for much better performance.

---

### Why Per-State Batching Instead of Global Scheduler?

**Decision:** Each `state()` object maintains its own microtask flush.

**Reasoning:**
- **Simplicity:** No global state to manage or debug
- **Isolation:** One state's batching doesn't affect another
- **Easier testing:** Can test each state independently
- **Predictable:** Clear execution order within each state
- **Minimal:** Aligns with "no framework tax" philosophy

**Alternatives considered:**
- ❌ Global scheduler (like Vue/React) → More complex, harder to test, tighter coupling

**Tradeoff:** Effects depending on multiple states may run multiple times (acceptable for Lume's use cases).

---

### Why `$subscribe()` Calls Immediately?

**Decision:** `$subscribe(key, fn)` calls `fn` with the current value immediately.

```javascript
store.count = 5;
store.$subscribe('count', val => {
  console.log(val); // Logs 5 immediately (synchronous)
});
```

**Reasoning:**
- **Consistency:** Ensures subscriber always has the current value
- **Initialization:** Sets up DOM/UI state on first call
- **Standard pattern:** Matches RxJS `.subscribe()`, Svelte stores
- **Prevents bugs:** No "forgot to initialize" issues

**Alternatives considered:**
- ❌ Only notify on changes → Forces manual initialization, easy to forget
- ❌ Batched initial call → Delay feels broken for setup code

**Tradeoff:** Subscribers must handle being called immediately (usually what you want anyway).

---

### Why Auto-Ready `bindDom()` by Default?

**Decision:** `bindDom()` automatically waits for DOMContentLoaded if needed.

```javascript
// Works anywhere - no timing issues!
bindDom(document.body, store);
```

**Reasoning:**
- **Zero friction:** "Just works" without thinking about timing
- **Fewer bugs:** Eliminates entire class of "DOM not ready" errors
- **Better DX:** New users don't hit timing issues immediately
- **Standards-based:** Uses native `DOMContentLoaded` event
- **Opt-out available:** `{ immediate: true }` for edge cases

**Alternatives considered:**
- ❌ Require manual `DOMContentLoaded` → Worse DX, common pitfall
- ❌ Add `onMount()` helper → Extra API surface, feels like framework lifecycle hooks

**Tradeoff:** Tiny overhead checking `document.readyState` (negligible).

---

## Binding Patterns

### Why Nested State for Multiple Checkboxes Instead of Arrays?

**Decision:** Recommend nested state objects over array bindings for multiple checkboxes.

```javascript
// ✅ Recommended
const store = state({
  tags: state({
    javascript: true,
    python: false
  })
});
```

```html
<input type="checkbox" data-bind="tags.javascript">
<input type="checkbox" data-bind="tags.python">
```

**Why not array bindings?**

Array bindings like `store.tags = ['javascript', 'python']` would require:

1. **DOM scanning complexity:**
   - Scan all checkboxes to find which share the same binding path
   - Group them by `data-bind` attribute
   - Track which are checked/unchecked

2. **Ambiguous two-way sync:**
   - When unchecked: remove from array or set to empty?
   - When checked: append to array or set index?
   - What if user reorders checkboxes?

3. **Dynamic checkbox problems:**
   - Adding/removing checkboxes requires re-scanning DOM
   - Which checkbox "owns" which array index?
   - How to handle cleanup when checkbox is removed?

4. **Performance:**
   - Every checkbox update would trigger array mutation
   - Array mutations are harder to optimize than object property sets

**Nested state benefits:**
- ✅ Each checkbox has a clear, independent state path
- ✅ Easy to validate individual checkboxes
- ✅ Works naturally with Lume's property-based reactivity
- ✅ Simpler cleanup (each binding is independent)
- ✅ Better TypeScript support

**Alternatives considered:**
- ❌ Array bindings → Too complex for minimal library, edge cases proliferate
- ❌ Custom `data-array` attribute → Custom syntax breaks standards-only philosophy

**Tradeoff:** Slightly more verbose state structure for much simpler implementation and better explicitness.

**Future consideration:** Could add array binding support in v2.0+ if there's strong demand and a clean solution emerges.

---

### Why No Two-Way Binding for `contenteditable`?

**Decision:** Only support `data-bind` on standard form inputs, not `contenteditable`.

**Reasoning:**
- **Complexity:** `contenteditable` has inconsistent browser behavior
- **Cursor position:** Updating innerHTML loses cursor position
- **Security:** XSS risks if binding user input directly to innerHTML
- **Standards focus:** `contenteditable` isn't a standard form input
- **Workaround exists:** Use `effect()` for manual control

**Alternatives considered:**
- ❌ Add `contenteditable` support → Security risks, cursor issues, scope creep

**Workaround:**
```javascript
effect(() => {
  const el = document.querySelector('[contenteditable]');
  if (el.textContent !== store.text) {
    el.textContent = store.text; // Loses cursor position
  }
});
```

**Future consideration:** Could add with proper cursor position handling if there's demand.

---

## Performance Decisions

### Why No Virtual DOM?

**Decision:** Direct DOM updates using `element.value = x` and `element.textContent = x`.

**Reasoning:**
- **Simplicity:** No diff algorithm, no extra abstraction
- **Performance:** Direct updates are faster for small-to-medium UIs
- **Minimal:** Keeps library tiny (~2KB)
- **Predictable:** You see exactly what updates when
- **Standards:** Uses native DOM APIs

**Alternatives considered:**
- ❌ Virtual DOM → Adds complexity, size, and abstractions
- ❌ Template compilation → Requires build step

**Tradeoff:** Large lists (1000+ items) may be slower than virtual DOM frameworks. For those cases, use pagination or virtualization libraries.

---

### Why No Computed Properties in Core?

**Decision:** Move `computed()` to addons, not core.

**Reasoning:**
- **Core minimalism:** Most apps don't need computed values
- **Easy to add:** Users who need it import from `/addons`
- **Smaller core:** Keeps main bundle tiny
- **Separation of concerns:** Core = state + DOM, Addons = advanced patterns

**Alternatives considered:**
- ❌ Include in core → Increases bundle size for everyone

**Tradeoff:** Extra import line for users who need computed values (acceptable).

---

## TypeScript Decisions

### Why Include Type Definitions But No TypeScript Source?

**Decision:** Ship `index.d.ts` but write source in plain JavaScript.

**Reasoning:**
- **No build step:** Keep source code directly runnable
- **Simpler debugging:** Stack traces point to actual source
- **Easier contribution:** Lower barrier to entry
- **Smaller package:** No need for TypeScript tooling in dependencies
- **Type safety preserved:** `.d.ts` provides full IntelliSense

**Alternatives considered:**
- ❌ TypeScript source → Requires build step, complicates debugging
- ❌ No types → Poor DX for TypeScript users

**Tradeoff:** Type definitions must be manually kept in sync (acceptable with tests).

---

## Testing Decisions

### Why Vitest Instead of Jest?

**Decision:** Use Vitest for testing.

**Reasoning:**
- **Faster:** Native ESM support, no transform overhead
- **Better DX:** Hot module reload for tests
- **Modern:** Built for Vite ecosystem
- **Compatible:** Jest-like API, easy migration

**Alternatives considered:**
- ❌ Jest → Slower, requires babel/transform setup

---

## Future Considerations

### Features We Might Add Later

**After v1.0 stable:**
- Array-based checkbox bindings (if clean solution found)
- `contenteditable` support with cursor position handling
- Debounced input binding option
- Form validation addon
- Router addon (standards-based, using History API)

**Will NOT add:**
- Custom directive syntax (breaks standards-only principle)
- Build step requirement (breaks no-build-step principle)
- Virtual DOM (too complex for minimal philosophy)
- Lifecycle hooks (too framework-y)

---

## How to Suggest Changes

If you think a decision should be reconsidered:

1. **Open an issue** with:
   - Why the current approach is problematic
   - Your proposed alternative
   - How it aligns with Lume's philosophy
   - Performance/complexity tradeoffs

2. **Show a use case** where current design fails

3. **Propose implementation** (code or pseudocode)

We're open to change, but will prioritize **simplicity and standards** over features!

---

## Document History

- **2025-11-20:** Initial version documenting core decisions
