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

**Tradeoff:** Effects depending on multiple states may run multiple times (acceptable as the *default*; see `batch()` below for the explicit, opt-in way to group writes across stores).

---

### Why `batch()` Is Part of the Kernel (v2.3)

**Decision:** Ship a synchronous, opt-in `batch(fn)` in core (`lume-js` and `lume-js/state`), implemented in `core/batch.js` behind a single seam in `state.js`.

```javascript
import { state, effect, batch } from 'lume-js';

batch(() => {
  cart.items = [...cart.items, item];
  totals.sum += item.price;
});
// effects reading both stores ran exactly ONCE, synchronously
```

**Reasoning:**
- **The per-state tradeoff stayed, but gained an escape hatch.** Per-state microtask batching remains the default and is unchanged. `batch()` is lexical and opt-in — nothing changes unless you call it.
- **Scheduling is core semantics, not an extension.** Plugins extend what happens *around* reads/writes; handlers extend what attributes *mean*; `withReadObserver` extends how reads are *observed*. Batching changes *when the engine runs* — it lives inside the write path, which is why it cannot be a plugin (a plugin cannot un-queue a scheduled microtask, flush synchronously, or dedupe private effect queues). Every peer library (Solid, Svelte, Vue, MobX, Preact Signals) reached the same conclusion: `batch` is core, never a plugin.
- **The universal audience wants it most.** Tests, servers, and CLI code benefit from the synchronous flush (`batch(() => {...}); assert(...)`) even more than browsers do.
- **Measured cost:** +0.37 KB gz on the kernel (1.08 → 1.45 KB).

**Alternatives considered:**
- ❌ Global pluggable scheduler (`setScheduler`) → last-writer-wins global, import-order coupling, conflicts with `sideEffects: false`; explored and rejected on `feature/pluggable-scheduler`
- ❌ Batch as a `withPlugins` plugin → plugins sit outside the write scheduler; cannot deliver synchronous flush or cross-store dedupe
- ❌ Per-store opt-in (`state(obj, { scheduler })`) → viral: every `state()` call site must participate or batching silently has holes
- ❌ `globalThis` symbol channel → implicit global coupling; violates "explicit over magic"

**Keeping batch optional later (decided, not built):** `state.js` touches batching through exactly one seam — `enqueueIfBatching(handle)` — and `batch.js` never imports `state.js`. If a batch-free kernel is ever wanted, either a `state-lite` artifact (hook compiled out at build time) or a per-store scheduler option can be added **without breaking changes**. We deliberately did not build this now.

**Tradeoff:** Every `lume-js/state` consumer carries ~0.37 KB of batch even if unused, in exchange for zero configuration and one consistent mental model.

---

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

#### Amendment (v2.3): the opt-in `on()` handler

**Decision:** The rejection above targets *custom syntax* (`@click`, `on:click`) and *inline code* (`onclick="count++"`). The opt-in `on()` handler is neither, and is now allowed:

```html
<button data-onclick="addTodo">Add</button>
```

```javascript
import { on } from 'lume-js/handlers';
const store = state({ addTodo() { ... } });
bindDom(root, store, { handlers: [on('click')] });
```

**Why this passes the original reasoning:**
- **Standards-only:** `data-on*` is a valid `data-*` attribute — no custom syntax.
- **No code in HTML:** the attribute references a *state key holding a function*, exactly as `data-bind` references a state key holding data. No expressions, no eval — an injected attribute can only point at functions already in reachable state (same trust model as `data-bind`).
- **Separation of concerns preserved:** logic lives in JS (the function in state); HTML only declares the wiring — the same relationship `data-bind` established for data.
- **Opt-in handler:** zero bytes and zero behavior unless imported and passed to `bindDom` — consistent with the handler-system decision.

`addEventListener()` remains the documented default; `on()` is the declarative option for state-driven apps (and makes handlers runtime-swappable by assignment).

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

repeat(container, store, 'items', {
  key: item => item.id,
  create: (item, el) => { el.textContent = item.name; },
  update: (item, el) => { el.textContent = item.name; }
});
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

**Current Status (v2.3):** The `repeat` addon is stable, with keyed reconciliation, `create`/`update` separation, focus/scroll preservation — and a declarative **template mode** (below).

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

### Why `repeat()` Gained a Template Mode (v2.3)

**Decision:** `repeat()` accepts `template: true | selector | HTMLTemplateElement`; the template's single root is cloned per item and its `data-bind` paths bind against **each item** (`"name"`, `"user.city"`, `"$item"`, `"$index"`).

```html
<ul id="list">
  <template>
    <li><strong data-bind="name"></strong></li>
  </template>
</ul>
```

```javascript
repeat('#list', store, 'people', { key: p => p.id, template: true });
```

**Reasoning:**
- **It automates this document's own recommendation.** "Option 3: Template element" above was already the documented user-land pattern — template mode is that exact pattern with the cloning, caching, and re-binding handled.
- **Standards-only:** `<template>` is the platform's templating primitive; `data-bind` is the attribute users already know. No expressions, no custom syntax — paths only.
- **Attacks the verbosity problem** (VISION.md's hardest open problem): list rows no longer require imperative `createElement`/`innerHTML` code.
- **Value semantics shared with core:** template bindings call `bindDom`'s own `applyBindValue`, so item bindings and store bindings can never drift.

**Boundaries (deliberate):**
- One-way snapshot bindings — items are plain objects, not stores. Two-way per-row binding would require per-item stores, conflicting with "explicit nested states".
- `render` is ignored (with a warning) in template mode; `create`/`update` compose on top.
- Exactly one root element per template, enforced with a clear error.

**Tradeoff:** `data-bind` inside a repeat template resolves against the item rather than the store — context-dependent meaning for one attribute, consistent with `data-bind`'s existing context-awareness (input vs span).


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

**Tradeoff:** Reorder-heavy updates on very large lists (1000+ rows) may move more DOM nodes than minimal-move virtual DOM diffing — `repeat()` reconciles in a single forward pass, not with an LIS-style algorithm. For ordinary updates this is not a penalty: keyed element reuse plus the same-reference/same-index skip make the work proportional to what actually changed, with no vnode allocation at all. For very large lists, prefer pagination or virtualization — as you would with any framework.

#### Amendment (v2.3, 2026-07): minimal-move reordering, still no virtual DOM

**Decision:** The tradeoff above no longer holds — `repeat()` now reorders with a minimal-move plan: departed rows are removed first, then the longest increasing subsequence over the surviving rows' previous positions marks the nodes already in the right relative order, and only the nodes off that chain are re-inserted (end to start, before the nearest settled node). A k-item change costs O(k) DOM moves instead of cascading into every node after the first mismatch. This is not a virtual DOM: the diff runs on real elements and their previous indices, with no vnode allocation, no render functions, and no change to the addon's API or observable order/lifecycle semantics.

**Reasoning:**
- Moving a DOM node is the expensive part of a list update: it invalidates layout, and reinserted `iframe`/`video` elements reset. The old forward pass turned one far move into O(distance) moves — a 167-swap storm across 2,000 rows cost ~2,000 `insertBefore` calls per tick, indistinguishable from a full shuffle.
- Measured in the animated-grid example (2,000 tiles, DevTools 20x CPU throttle): storm DOM moves per tick ~2,000 → ~310, worst frame gap 674ms → 465ms, main-thread blocking over a 12s storm 9.0s → 3.5s, sampled fps 4.7 → 9.1. jsdom-verified bounds: a far 2-item swap in 100 rows is ≤2 moves (was ~90), removals move zero survivors, k scattered inserts are exactly k moves.
- Full permutations are unchanged by design (nearly every node must move regardless); the O(n log n) bookkeeping added no measurable cost there (shuffle critical path within noise).

**Alternatives considered:**
- ❌ Keep the forward pass → simplest, but sparse reorders (the common real case: swaps, drag-drop, sort-by-column) pay O(n) moves for O(k) changes.
- ❌ Key-index map without LIS (Vue 2 style patching) → fewer moves than the forward pass but still moves nodes that were already in relative order.
- ❌ Full virtual DOM diff → rejected above; nothing about minimal moves requires vnodes.

**Tradeoff:** +0.21 KB gz on the addons bundle (4.68 → 4.89, budget 6) and O(n log n) index bookkeeping per update (Set + Map + one binary-search pass), paid on every list update to make sparse reorders O(k) — negligible against the DOM operations it removes, and shuffle-scale updates showed no measurable regression.

---

### Why Effects Reuse Their Subscriptions Across Runs (v2.3, 2026-07)

**Decision:** Auto-tracked effects keep their dependencies in a persistent per-effect registry (store → key → subscription record). A re-run stamps each dependency it reads with the run's generation; a dependency that already has a record makes no new subscription, and records not stamped by a completed run are swept (unsubscribed) afterwards. Runs that read nothing and runs that throw keep every subscription, so the effect stays reactive. Tracking semantics are unchanged: conditional dependencies attach on first read and drop when a completed run stops reading them.

**Reasoning:**
- The previous implementation tore down and rebuilt every subscription on every run: N unsubscribes (indexOf + splice on listener arrays), N re-subscribes, and ~2N closure allocations per run, even when the read set was identical — and the read set is identical for almost every re-run in practice.
- The cost scales with dependency width, exactly where effects are most useful: an aggregate effect reading 3,000 stores re-ran 7.5x faster after the change (23.8ms → 3.2ms per run in Chrome under a matched CPU throttle; both measurements on the same rig, verified with a busy-loop probe).
- `computed()` is built on `effect()`, so derived values inherit the gain with no changes.
- The old error path also leaked: it discarded the unsubscribe functions of subscriptions made before the throw, leaving listeners that could never be removed. Keeping the records makes the throwing path leak-free with less code, not more.

**Alternatives considered:**
- ❌ Keep teardown/rebuild → simplest, but pays O(deps) churn for the common no-change case and O(1) savings only in the rare shrink case.
- ❌ Version-tagged global epochs (Vue/Preact-signals style doubly-linked dependency lists) → the churn win without the sweep walk, but substantially more code and pointer bookkeeping than this library's size budget justifies.
- ❌ Never drop stale dependencies → cheapest, but a conditional dependency would keep re-running the effect forever (correctness regression, and a memory leak for dynamic reads).

**Tradeoff:** The sweep is O(total dependencies) when a run drops something (unchanged from before, minus the rebuild), and each effect holds strong references to the store proxies it reads via the registry Map — the same lifetime the old unsubscribe closures already implied. Dependency records cost one small object each, allocated once instead of once per run.

---

### Why Writes to an Unobserved Store Skip the Flush Pipeline (v2.3, 2026-07)

**Decision:** The `set` trap short-circuits after storing the value when the store has zero listeners (across all keys — one live integer maintained by `addListener`/unsubscribe) and no `$beforeFlush` hooks: no pending-notification entry, no batch enqueue, no microtask flush. The flush's notify step also drops pending notifications outright when nothing listens (reachable when only hooks scheduled the flush).

**Reasoning:**
- A store nothing observes still paid the full write pipeline per changed key — Map insert, batch enqueue or microtask schedule, then a flush that notified nobody. That cost is O(writes) exactly where writes are heaviest: high-churn data layers that are *polled* (a rAF render loop reading `store.value`) rather than subscribed.
- Measured in a 3,000-cell stress grid under a 20x CPU throttle: worst write-pass frame 156ms → 16ms (~10x), kernel share of active CPU ~9% → ~1.5%, landing reactive writes within ~1–2x of raw plain-array writes — so churny layers keep `state()` instead of abandoning reactivity for plain data.
- No update can be missed: `$subscribe` delivers the current value immediately on registration, and effects subscribe to a key before they can depend on it, so anything that starts observing sees exactly the state it would have seen.

**Alternatives considered:**
- ❌ Per-key listener counts → finer-grained skipping, but more bookkeeping per subscribe/unsubscribe for a store-level question one integer answers; per-key wins only for stores that are partially observed *and* write-heavy on the unobserved keys — not the measured hot case.
- ❌ An explicit opt-in ("silent store" API) → new API surface for something that is safe to do automatically; explicit-over-magic applies to *behavior*, and no observable behavior is removed.
- ❌ Telling users to use plain objects for churny layers → loses reactivity at the edge where it may later be wanted; measurement showed the fast path captures ~85% of what plain data buys.
- ❌ A kernel change-signal (dirty-list) primitive so pollers get O(changed) scans → measured: no responsiveness gain (rendering is paint-bound, not scan-bound) and the signal itself taxes the write path this decision is removing cost from.

**Tradeoff:** One integer of listener accounting on the subscribe/unsubscribe paths (the double-unsubscribe no-op is guarded by the existing index check). One semantic sharpening: a subscriber registered between a write and its microtask no longer receives a duplicate flush delivery of that write — the immediate `$subscribe` call already delivered the current value (previously it got both). +0.03 KB gz on the kernel (1.46 → 1.49, budget 1.75).

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

import { withPlugins } from 'lume-js/addons';
const store = withPlugins(
  state({ count: 0 }),
  [debugPlugin]
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
- **Honest Admission:** Auto-tracking uses `withReadObserver` — a scope-based read observer that is only active during the synchronous execution of an effect's body. This is less magical than a `globalThis` property or a permanently-installed hook, but still implicit within the scope.
- **Why Keep Auto-tracking?**
  1. **Backward Compatibility:** Converting existing code would be painful.
  2. **Simplicity:** It's still the easiest way to write simple View logic (`el.textContent = store.count`).
- **Why Explicit Deps?**
  - **Philosophy Alignment:** Fits "explicit over magic". You know exactly what triggers the effect.
  - **Safety:** Prevents infinite loops and accidental tracking (e.g., reading a value for logging shouldn't trigger a re-run).
- **Architecture Note:** `state.js` does not permanently know about `effect.js`. Read tracking is only active when a function is executed inside `withReadObserver(onRead, fn)`. Multiple observers (nested effects, devtools, computed) are supported simultaneously via a `Set` of active readers.

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

### Why Explicit-Deps Effects Coalesce to One Run per Tick (v2.3)

**Decision:** In explicit-deps mode, any number of tracked keys changing in the same tick — across any number of stores — produces exactly one re-run, scheduled on the next microtask.

**Reasoning:**
- **Bug half:** within one store, running once per changed key contradicted the documented batching promise ("multiple property changes trigger effects once"). Auto-tracking already behaved correctly via the per-state effect queue.
- **Semantics half:** explicit mode's contract is "run when any listed dependency changed", which naturally coalesces across stores too. This makes explicit mode *stricter* than auto mode (which runs once per store, per the per-state decision) — acceptable because explicit deps are the "Logic" mode where redundant runs are pure waste, and the dependency list is spelled out by the developer.
- A `disposed` guard ensures a run pending at cleanup time never fires.

**Tradeoff:** Re-runs happen one microtask later than before (after the store's flush rather than during subscriber notification). No observable difference for code awaiting a tick.


---

### Why `data-{attr}` for Reactive HTML Attributes?

**Decision:** Make HTML attributes reactive by prefixing with `data-`. Use explicit selector list (not dynamic scanning) for performance. Extend via composable handler objects passed to `bindDom()`.

```html
<!-- Built-in: always available, no imports needed -->
<div data-hidden="isLoading">Content</div>
<button data-disabled="isSubmitting">Submit</button>
<input data-checked="isAgreed" type="checkbox">
<input data-required="fieldRequired">
<button data-aria-expanded="menuOpen">Menu</button>
<div data-aria-hidden="isCollapsed">Panel</div>
```

```html
<!-- Extended: import handlers, pass to bindDom -->
<span data-show="isVisible">Shown when truthy</span>
<div data-class-active="isActive">CSS class toggle</div>
<a data-href="profileUrl">Profile</a>
<input data-readonly="isReadonly">
```

```js
// Implementation: Handler objects with compiled selectors
import { show, classToggle, stringAttr } from 'lume-js/handlers';

bindDom(root, store, {
  handlers: [show, classToggle('active'), stringAttr('href')]
});

// Handler contract: { attr: string, apply(el, val): void }
// Built-in defaults use same pattern internally:
//   boolHandler('hidden')  → { attr: 'data-hidden', apply(el, val) { el.hidden = Boolean(val); } }
//   ariaHandler('aria-expanded') → { attr: 'data-aria-expanded', apply(el, val) { el.setAttribute(...); } }
```

**Reasoning:**
1. **Extends `data-bind` naturally:** Same pattern users already know (`data-{thing}="stateKey"`)
2. **Standards-based:** `data-*` is valid HTML5, works with validators
3. **Explicit mapping:** `data-hidden` → `hidden`, no interpretation needed
4. **Performance:** Compiled selectors built from handler list, `O(n)` DOM pass
5. **Composable:** Handlers are plain objects — combine, override, create custom ones
6. **Tree-shakeable:** Only import the handlers you use (`lume-js/handlers`)
7. **No core modification:** New attributes never require changing `bindDom` source

**Handler system design (v2.0.0-beta.2):**
- Built-in handlers (always active): `hidden`, `disabled`, `checked`, `required`, `aria-expanded`, `aria-hidden`
- User handlers override built-ins with same `attr` (Map deduplication)
- Arrays auto-flattened (supports `classToggle()` returning multiple handlers)
- Custom handler = any object with `{ attr, apply }` — no framework API needed

**Alternatives considered:**
- ❌ Custom directives (`x-hidden`, `v-if`, `x-bind:hidden`) → Breaks standards-only philosophy
- ❌ Generic syntax `data-attr="hidden:isLoading"` → More complex, harder to scan
- ❌ Dynamic scanning (scan all `data-*` attrs) → Ambiguity with non-Lume attrs (`data-testid`), O(n × m)
- ❌ Side-effect imports (auto-register on import) → Violates "explicit over magic" philosophy
- ❌ Marker attribute hybrid (`data-lm` + store-key matching) → Still has collision risks

**What we deferred:**
- `data-style` — Security implications need careful design
- Expressions (`data-hidden="count > 5"`) — Violates explicit philosophy

**What we resolved (previously deferred):**
- ✅ `data-show` — Implemented as `show` handler (inverse of `data-hidden`)
- ✅ `data-class-{name}` toggle — Implemented as `classToggle()` factory
- ✅ `data-href`, `data-src` — Implemented as `stringAttr()` factory
- ✅ Negation pattern — `data-show` is the positive counterpart to `data-hidden`

**Tradeoff:** Explicit handler registration means users opt in to each attr. But this gives performance (compiled selectors), safety (no ambiguity), and composability (mix and match handlers).

---

### Why a `persist()` Addon (v2.3)

**Decision:** Ship localStorage/sessionStorage sync as an addon: hydrate watched keys on call, save on change.

**Reasoning:**
- On the VISION roadmap (~500B estimate; measured 0.75 KB standalone), and every example app was hand-rolling the same `JSON.parse(localStorage.getItem(...))` + scattered `setItem` pattern.
- **Allowlist hydration:** only watched keys are ever assigned from storage — stale or tampered storage cannot inject state (the core `set` trap independently blocks prototype-polluting keys).
- **Contained failures:** corrupted JSON starts fresh, circular state skips the save, quota errors warn, missing storage (SSR) disables itself. Persistence is a convenience; it must never take the app down.
- Saves coalesce to one write per microtask and skip unchanged snapshots.

**Alternatives considered:**
- ❌ In core → bloats everyone; storage is not a reactivity concern
- ❌ Cross-tab sync via the `storage` event → deferred; clean additive option later

**Tradeoff:** One JSON blob per `persist()` call; plain-data values only (functions/symbols are skipped by JSON).

---

## Packaging Decisions

### Why a `lume-js/state` Entry Instead of Demoting bindDom/effect (v2.3)

**Decision:** Publish the DOM-free kernel (`state`, `batch`, `withReadObserver`) as an additional entry — `lume-js/state` (1.45 KB gz, own CI budget) — while `lume-js` keeps exporting the full core.

**Reasoning:**
- The original goal (state-only core for Node/CLI) is a *packaging* question, not a source question: the source was already layered (state imports nothing upward; effect/bindDom sit on its public seams).
- **No-build users can't tree-shake** — for the library's primary audience the universal core must exist as a downloadable file (`dist/state.min.mjs`), not a theoretical import subset.
- Demoting `bindDom`/`effect` out of `lume-js` would break every existing user for zero byte savings (bundlers already drop them for state-only importers via `sideEffects: false`).
- Per-entry CI budgets keep both numbers honest: kernel ≤ 1.75 KB, full core ≤ 3 KB.

**Tradeoff:** Two documented entry points instead of one. Worth it: "1.45 KB universal / 2.66 KB with DOM" is the honest size story.

---

## Tooling Decisions

### Why Docs Facts and Navigation Are Generated (docs:sync)

**Decision:** Facts that change with every build (version, gzipped sizes, test count, browser floor) live in exactly one generated file, `docs/metrics.json` (`scripts/build-metrics.js`, never hand-edited). Structure that changes when pages are added or reordered (nav order, the `docs/README.md` index, the `llms.txt`/`llms-full.txt` bundle order) lives in exactly one authored file, `docs/manifest.json`. `scripts/sync-docs.js` rewrites `<!-- lume:* -->` marker regions embedded directly in the real files — README badges, guide prose, nav footers — from those two sources; `npm run docs:check` fails CI when running the sync would produce a diff.

**Reasoning:**
- Every one of these had shipped as a real bug at some point: the FAQ claiming "2.x is in beta" a year after stable, README and the installation guide quoting three different sizes for the same bundle, `build-llms.js`'s hardcoded section list pointing at two API pages that didn't exist while omitting all eight handler pages, a tutorial with two contradictory prev/next footers, and a version bump in `package.json` that left `llms.txt`'s `Version:` line stale. All of these are the same failure mode — a fact or a link typed as a literal in more than one place — and a CI gate that only checks *some* of the copies will always miss the others.
- Markers live inside the real files rather than a separate template tree so there is no second copy to keep in sync with the first: each file is simultaneously the template and the rendered output.
- An unrecognized `lume:` marker key is a hard build error, not a silently-ignored no-op — a typo in a marker name is exactly the kind of drift this exists to catch.
- `docs/design/design-decisions.md` (this file), `CHANGELOG.md`, and `CLAUDE.md`/`AGENTS.md` are deliberately excluded from marker management — they are historical or hand-authored-by-contract documents (see the "amend, never rewrite" convention already in force here), not facts that should be silently overwritten by a build script.

**Alternatives considered:**
- *A single hand-maintained checklist* ("update these N places when X changes") — this is what existed before, and it is exactly what kept failing; checklists rely on someone remembering to run them.
- *A separate template directory rendered into the docs tree* — rejected because it doubles the files a contributor has to look at to understand what a page says, and markdown-in-markdown templating adds a build step of its own for very little benefit over inline markers.

**Tradeoff:** Every fact-bearing sentence in a managed file now carries a pair of HTML comments, which is visible noise in the raw markdown (and, in a few code-fence examples, in the rendered output too — see `docs/guides/installation.md`'s version-pin example). Traded for: it is no longer possible for these specific facts to silently disagree with each other across the repo.

---

## Future Considerations

**Features We Might Add Later:**

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
- Custom event syntax (`@click`, `on:click`) or inline handlers — the opt-in `data-on*` handler (state-key references only) is the allowed form; see the v2.3 amendment above
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

**← Previous: [Working with Arrays](../tutorials/working-with-arrays.md)**
