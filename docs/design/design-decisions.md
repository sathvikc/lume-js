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

### Why Only Objects in State (Not Primitives)?

**Decision:** `state()` only accepts objects, not primitives.

```javascript
// ✅ Correct
const store = state({ count: 0 });

// ❌ Won't work
const count = state(0);  // Error: Must pass an object
```

**Reasoning:**
1. **Proxy limitation:** JavaScript Proxies can only wrap objects, not primitives
2. **Consistency:** All state uses the same API (dot notation)
3. **Namespace benefits:** `store.count` is clearer than generic `value`
4. **Multiple properties:** Objects naturally group related state
5. **Extensibility:** Easy to add more properties later

**Why this doesn't limit applications:**

```javascript
// ✅ Single value? Just use one property
const timer = state({ seconds: 0 });

// ✅ Boolean flag? Same pattern
const ui = state({ isOpen: false });

// ✅ Multiple related values? Natural grouping
const auth = state({ 
  user: null, 
  token: '', 
  isLoggedIn: false 
});

// ✅ Need multiple stores? Create multiple objects
const counter = state({ count: 0 });
const todos = state({ items: [], filter: 'all' });
```

**Alternatives considered:**
- ❌ Support both primitives and objects → Inconsistent API, confusing edge cases
- ❌ Use getter/setter functions → Verbose, doesn't match natural property access

**Tradeoff:** Slight verbosity (wrapping in object) for consistency and clarity.

---

### Why Nested State Must Be Explicitly Wrapped?

**Decision:** Require explicit `state()` wrapping for nested objects.

```javascript
// ✅ Required
const store = state({
  user: state({ name: 'Alice' })  // Must wrap
});

// ❌ Won't work reactively
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

### Why No Built-in Event Handling (`@click` style)?

**Decision:** Use standard `addEventListener()`, not custom event attributes.

```javascript
// ✅ Lume.js approach
document.getElementById('btn').addEventListener('click', () => {
  store.count++;
});
```

```html
<!-- ❌ NOT supported (Alpine/Vue style) -->
<button @click="count++">Increment</button>
```

**Reasoning:**
- **Standards-only:** `addEventListener()` is the standard way
- **No custom syntax:** Keeps HTML validator-friendly
- **Flexibility:** Use event delegation, capture phase, passive listeners, etc.
- **Familiarity:** Everyone knows `addEventListener()`
- **Separation of concerns:** HTML stays declarative, JS handles logic

**Alternatives considered:**
- ❌ Custom `@click` or `on:click` → Breaks standards-only philosophy
- ❌ Inline handlers `onclick="..."` → Poor separation, XSS risks

**Tradeoff:** Slightly more verbose, but keeps everything standards-compliant.

---

### Why No Conditional Rendering (`v-if`, `x-if`)?

**Decision:** Use standard JavaScript for conditionals, not template directives.

```javascript
// ✅ Lume.js approach
store.$subscribe('isLoggedIn', (value) => {
  document.querySelector('.user-menu').style.display = 
    value ? 'block' : 'none';
});
```

```html
<!-- ❌ NOT supported (Vue/Alpine style) -->
<div v-if="isLoggedIn">Welcome back!</div>
```

**Reasoning:**
- **Standards-only:** No custom template syntax needed
- **Full control:** Use any DOM manipulation method you prefer
- **Simple mental model:** "Just JavaScript" - no special rules
- **Integration:** Works with any DOM library (jQuery, GSAP, etc.)

**Alternatives (user can choose):**
```javascript
// Option 1: Display toggle
el.style.display = condition ? 'block' : 'none';

// Option 2: Add/remove from DOM
if (condition) {
  parent.appendChild(el);
} else {
  el.remove();
}

// Option 3: Use classes
el.classList.toggle('hidden', !condition);
```

**Tradeoff:** More manual, but gives complete flexibility and stays standards-compliant.

---

### Why No Loop Rendering in Core (`v-for`, `x-for`)?

**Decision:** Core uses standard JavaScript for loops; `repeat()` helper planned as optional addon.

```javascript
// ✅ Core approach - pure JavaScript
store.$subscribe('items', (items) => {
  const container = document.querySelector('.list');
  container.innerHTML = items.map(item => `
    <li>${item.name}</li>
  `).join('');
});
```

```javascript
// ✅ Future addon approach
import { repeat } from 'lume-js/addons';

repeat(container, store.items, item => `
  <li>${item.name}</li>
`);
```

```html
<!-- ❌ NOT supported - custom template syntax -->
<li v-for="item in items">{{ item.name }}</li>
```

**Reasoning:**
- **Core minimalism:** Most users can write their own loops easily
- **Standards-only in core:** No custom syntax required
- **Flexibility:** Users choose their strategy (innerHTML vs createElement)
- **Addon for convenience:** `repeat()` helper for common use case
- **No lock-in:** If repeat() doesn't fit, just use JavaScript

**Alternatives (user can choose):**
```javascript
// Option 1: Template literals (simple)
container.innerHTML = items.map(i => `<li>${i.name}</li>`).join('');

// Option 2: createElement (more control)
items.forEach(item => {
  const li = document.createElement('li');
  li.textContent = item.name;
  container.appendChild(li);
});

// Option 3: Template element (reusable)
const template = document.querySelector('#item-template');
items.forEach(item => {
  const clone = template.content.cloneNode(true);
  clone.querySelector('.name').textContent = item.name;
  container.appendChild(clone);
});
```

**Current Status (v0.5.0):**
The `repeat` addon is available as an **@experimental** feature.

```javascript
import { repeat } from 'lume-js/addons';

// ⚠️ IMPORTANT: Arrays must be updated immutably!
// store.items.push(newItem);       // ❌ Won't trigger update
// store.items = [...store.items, newItem]; // ✅ Triggers update

repeat(container, store, 'items', {
  key: item => item.id,
  create: (item, el) => {
    el.innerHTML = '<span class="name"></span>';
  },
  update: (item, el) => {
    el.querySelector('.name').textContent = item.name;
  }
});
```

**Why Immutable Updates?**
- **Performance:** Checking reference equality (`oldArray === newArray`) is instant.
- **Simplicity:** No need to monkey-patch `Array.prototype.push` or use expensive Proxies on arrays.
- **Predictability:** Explicit updates mean explicit renders.

**Tradeoff:** Users must learn to use spread syntax (`[...items, new]`) instead of `push()`.

### Why `create` + `update` Instead of Just `render`?

**Problem:** A single `render` function forces users to guard one-time setup:

```javascript
render: (item, el) => {
  if (!el.dataset.bound) {
    el.innerHTML = '...';  // DOM setup
    el.addEventListener('click', ...);  // Event listeners
    el.dataset.bound = 'true';
  }
  el.textContent = item.name;  // Data binding
}
```

**Decision:** Explicit separation with `create` and `update` callbacks.

```javascript
create: (item, el) => {
  el.innerHTML = '...';  // Once
  el.addEventListener('click', ...);  // Once
},
update: (item, el) => {
  el.textContent = item.name;  // Every render
}
```

**Benefits:**
- Cleaner code without guards
- Event listeners attached exactly once
- Clear intent: structure vs data

### Why Check Both Reference AND Index for Update Skip?

**Problem:** If only checking item reference, reordered items don't update:

```javascript
// Items: [Alice, Bob] → [Bob, Alice]
// Same references, different indices
// Index-dependent rendering (e.g., "Item #1") would be wrong
```

**Decision:** Skip `update` only when both reference AND index unchanged.

```javascript
if (prevItem !== item || prevIndex !== i) {
  update(item, el, i, { isFirstRender });
}
```

**Tradeoff:** Slightly more overhead, but correct behavior for index-dependent renders.

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
- **Workaround exists:** Use manual subscriptions for control

**Alternatives considered:**
- ❌ Add `contenteditable` support → Security risks, cursor issues, scope creep

**Workaround:**
```javascript
store.$subscribe('text', (value) => {
  const el = document.querySelector('[contenteditable]');
  if (el.textContent !== value) {
    el.textContent = value; // Note: Loses cursor position
  }
});
```

**Future consideration:** Could add with proper cursor position handling if there's demand.

---

### Why `data-bind` Only (Not `data-model` or `data-text`)?

**Decision:** Single attribute `data-bind` for both one-way and two-way binding.

```html
<!-- One attribute for everything -->
<span data-bind="count"></span>
<input data-bind="name">
```

**Reasoning:**
- **Simplicity:** One concept to learn
- **Context-aware:** Behavior changes based on element type (span vs input)
- **Less typing:** Shorter HTML
- **Consistent:** Same pattern everywhere

**Alternatives considered:**
- ❌ Separate `data-model`, `data-text`, `data-value` → More API surface
- ❌ Directionality flags `data-bind.one-way` → Custom syntax

**Tradeoff:** Slightly less explicit, but much simpler API.

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

## Extension Patterns

### Why Plugin System (v2.0+)?

**Decision:** Add optional plugin system with hook-based architecture.

```javascript
const debugPlugin = {
  name: 'debug',
  onGet: (key, value) => {
    console.log(`GET ${key}:`, value);
    return value;
  }
};

const store = state(
  { count: 0 },
  { plugins: [debugPlugin] }
);
```

**Reasoning:**
- **Zero-cost abstraction:** Unused plugins add 0 bytes to bundle
- **Universal compatibility:** Core state.js works in Node.js, Deno, browsers
- **Extensibility:** Third-party plugins possible without core changes
- **Separation of concerns:** Advanced features in addons, not core
- **Backward compatible:** Optional, doesn't break existing code

**Why not built-in features:**
- ❌ Adding validation/logging/history to core bloats everyone's bundle
- ❌ Different apps need different features
- ❌ Can't predict all use cases

**Plugin architecture benefits:**
- ✅ Debug tools only in development builds
- ✅ Validation only where needed
- ✅ Tree-shakeable by design
- ✅ Community can create plugins

**Tradeoff:** Slight API verbosity (pass plugins array) for much better modularity.

**Performance:** Typical overhead 10-30% with 1-3 plugins. Acceptable for most use cases.

---

### Why Debug Addon in Addons (Not Core)?

**Decision:** The debug addon (`createDebugPlugin`, `debug.stats()`, `debug.filter()`) lives in `/addons`, not core.

**Reasoning:**
- **Zero production cost:** Debug tools are development-only; bundling them in core wastes bytes in production.
- **Tree-shakeable:** Users who don't need debugging pay nothing.
- **Plugin architecture showcase:** Demonstrates how plugins extend Lume.js without core changes.
- **Critical for adoption:** Hard to debug = hard to adopt. But it's still opt-in.

**Why include stats tracking?**
- **Visibility:** Developers need to see what's reactive (GETs, SETs, NOTIFYs).
- **Performance debugging:** Identify over-reactive properties causing unnecessary re-renders.
- **Educational:** Helps users understand fine-grained reactivity.

**Alternatives considered:**
- ❌ Built into core → Bloats production bundles
- ❌ External-only tools (devtools extension) → Higher barrier, less portable

**Tradeoff:** Requires explicit import for dev tooling, but keeps production lean.

---

### Why Support Explicit Dependencies in `effect()`?

**Decision:** Support two modes for `effect()`:
1. **Auto-tracking (Default):** Dependencies collected by property access
2. **Explicit Deps:** Dependencies passed as `[[store, 'key']]` array

```javascript
// Mode 1: Auto-tracking (Magic) - Good for Views
effect(() => {
  el.textContent = store.count; 
});

// Mode 2: Explicit (No Magic) - Good for Logic/Side-Effects
effect(() => {
  analytics.log(store.count);
}, [[store, 'count']]);
```

**Reasoning:**
- **Honest Admission:** Auto-tracking relies on global state magic (`globalThis...`). In hindsight, this violates Lume's "no magic" philosophy.
- **Why Keep Auto-tracking?**
  1. **Backward Compatibility:** Converting existing code would be painful.
  2. **Simplicity:** It's still the easiest way to write simple View logic (`el.textContent = store.count`).
- **Why Explicit Deps?**
  - **Philosophy Alignment:** Fits "explicit over magic". You know exactly what triggers the effect.
  - **Safety:** Prevents infinite loops and accidental tracking (e.g., reading a value for logging shouldn't trigger a re-run).

**Why `[store, key]` tuple syntax?**
- Lume.js uses proxies, not "refs" or "signals" as values.
- `store.count` is just a number/string value, not a reference.
- To subscribe explicitly, we need both the *object* (`store`) and the *property key* (`'count'`).
- Tuples are concise and typed: `Array<[ReactiveState, ...keys]>`.

**Alternatives considered:**
- ❌ React-style `[store.count]` → Passes value (5), not ref. Can't track changes.
- ❌ Strings `'store.count'` → Requires parsing, no type safety.
- ❌ Object `{ store, key: 'count' }` → Too verbose.

**Tradeoff:** Two ways to do one thing, but serves two distinct mental models (View vs Logic).

---

### Why `data-{attr}` for Reactive HTML Attributes?

**Decision:** Make HTML attributes reactive by prefixing with `data-`. Use explicit selector list (not dynamic scanning) for performance.

```html
<!-- Reactive visibility and form controls -->
<div data-hidden="isLoading">Content</div>
<button data-disabled="isSubmitting">Submit</button>
<input data-checked="isAgreed" type="checkbox">
<input data-required="fieldRequired">

<!-- Reactive ARIA -->
<button data-aria-expanded="menuOpen">Menu</button>
```

```js
// Implementation: Array-based config, explicit selectors
const BOOLEAN_ATTRS = ['hidden', 'disabled', 'checked', 'required'];
const ARIA_ATTRS = ['aria-expanded', 'aria-hidden'];

// Boolean attrs use DOM properties (el.hidden = true)
// ARIA attrs use setAttribute ('aria-expanded', 'true'/'false')
```

**Reasoning:**
1. **Extends `data-bind` naturally:** Same pattern users already know (`data-{thing}="stateKey"`)
2. **Standards-based:** `data-*` is valid HTML5, works with validators
3. **Explicit mapping:** `data-hidden` → `hidden`, no interpretation needed
4. **Performance:** Explicit selectors are `O(n)`, dynamic scanning is `O(n × m)`
5. **Easy to extend:** Adding new attr = add to array, selector rebuilds automatically

**Alternatives considered:**
- ❌ Custom directives (`x-hidden`, `v-if`, `x-bind:hidden`) → Breaks standards-only philosophy
- ❌ Generic syntax `data-attr="hidden:isLoading"` → More complex, harder to scan

**What we deferred:**
- Dynamic pattern (any `data-*` → attr) — Needs benchmarks for O(n × m) concern
- `data-class` — Replace-all is destructive. Needs toggle pattern like `data-class-active="isActive"`
- `data-href`, `data-src`, `data-style` — Security implications need careful design
- Expressions (`data-hidden="count > 5"`) — Violates explicit philosophy
- Negation (`data-hidden="!isVisible"`) — Use inverted state or future `data-show`

**Tradeoff:** Explicit selector list means we support specific attrs, not any attr. But this gives us performance and safety while remaining easy to extend.

---

## Future Considerations

**Features We Might Add Later:**

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
- Event handling syntax (`@click`, `on:click`)
- Template directives (`v-if`, `v-for`, `x-if`)

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

- **2026-01-23:**
  - Added reactive data-* attributes design decision
  - Documented DOM properties vs setAttribute for boolean attrs
  - Added ARIA handling rationale
  - Updated supported/deferred attribute lists
- **2026-01-14:**
  - Added explicit effect dependencies decision (auto-tracking vs explicit tradeoff)
  - Added debug addon design decision (why in addons, why stats tracking)
- **2026-01-12:**
  - Added `create`/`update` API design rationale
  - Added reference + index optimization reasoning
  - Updated test coverage to 162 tests
- **2025-12-19:**
  - Added plugin system rationale (v2.0)
  - Updated test coverage to 148 tests
- **2025-11-28:** 
  - Added `repeat` addon decision and immutable array update reasoning
  - Updated examples count and test coverage stats (114 tests)
- **2025-11-20:** 
  - Initial version documenting core decisions
  - Added reactive identity (`isReactive`) decision and `$` meta method tracking exclusion