# Lume.js — Project Goal

> **What Lume.js is, why it exists, and what it promises.**

---

## The Problem

Modern web development has an abstraction addiction.

1. **Frameworks break.** React 16 → 17 → 18 → 19 — each major version forces rewrites. Angular 1 → 2 was a complete rewrite. Vue 2 → 3 changed the entire composition model. Companies stay on old versions because upgrading costs more than the features are worth.

2. **Frameworks hide the web.** Developers learn JSX, not HTML. They learn `useState`, not `Proxy`. They learn framework-specific routing, not the History API. When the framework changes, their knowledge is worthless.

3. **Frameworks are heavy.** React + ReactDOM is 45KB gzipped. Angular is 90KB+. For a contact form. For a todo list. For a landing page with one interactive widget.

4. **Frameworks hurt the web.** SPAs break the back button, kill SEO, destroy accessibility, and require megabytes of JavaScript before a user sees content. The web was designed to work without JavaScript. Frameworks made JavaScript mandatory.

5. **Frameworks fight AI.** An AI agent working with React must navigate 100K+ lines of source, version-specific patterns ("is this hooks or class components?"), and constantly shifting best practices. The context window fills with framework ceremony instead of business logic.

---

## The Belief

**Web standards are good enough.**

- `Proxy` gives you reactivity — no need for a virtual DOM
- `data-*` attributes give you declarative binding — no need for custom template syntax
- `queueMicrotask` gives you batching — no need for a scheduler
- `querySelectorAll` gives you targeting — no need for a component tree
- ES modules give you code splitting — no need for a bundler

These APIs are standardized, spec-locked, and will work in every browser in 2036 the same way they work today. No deprecation. No breaking changes. No migration guides.

---

## What Lume.js IS

A **thin reactive binding layer** over web standards.

```
┌─────────────────────────────────────────────┐
│  Your HTML (standard data-* attributes)     │
├─────────────────────────────────────────────┤
│  Lume.js core (~2KB)                        │
│  state() + bindDom() + effect()             │
├─────────────────────────────────────────────┤
│  Browser APIs (Proxy, queueMicrotask, DOM)  │
└─────────────────────────────────────────────┘
```

**Three functions. That's the entire core.**

| Function | What it does | Browser primitive |
|----------|-------------|-------------------|
| `state(obj)` | Makes an object reactive | `Proxy` |
| `bindDom(root, store)` | Syncs state → DOM | `querySelectorAll` + `data-*` |
| `effect(fn)` | Runs code when state changes | `$subscribe` + `queueMicrotask` |

Everything else — computed values, list rendering, debugging, extra handlers — is in optional addons that you import only if needed.

---

## What Lume.js is NOT

- **Not a framework.** No component model, no lifecycle hooks, no virtual DOM, no JSX.
- **Not a React alternative.** If you need a component-based SPA with server components and suspense, use React.
- **Not comprehensive.** It doesn't do routing, HTTP, state management patterns, or testing utilities.
- **Not magic.** Every behavior is explicit. If you can't explain what a line does by reading it, it's a bug.

---

## The Promise

### To Developers

1. **Code you write today works forever.** No migration guides. No breaking changes in the core API. Ever.
2. **You can read the entire source.** ~700 lines of code. One context window for an AI. One afternoon for a human.
3. **You learn the web, not a framework.** Every concept in Lume maps directly to a browser API. When you outgrow Lume, your knowledge transfers.
4. **You pay for what you use.** Core is ~2KB gzipped. Addons are separate imports. If you only need `state()`, that's ~800 bytes.

### To Teams

1. **Zero upgrade cost.** Lock your version and forget about it. Or upgrade freely — nothing breaks.
2. **Any developer can contribute.** No framework expertise required. If they know HTML and JavaScript, they can work with Lume.
3. **No build step lock-in.** Works with Vite, Webpack, Parcel, or a plain `<script>` tag. Switch build tools without changing application code.

### To AI Agents

1. **Entire library fits in one context window.** ~700 lines of source. An agent reads it in seconds.
2. **No version confusion.** The API is frozen. No "is this the v2 or v3 way?" ambiguity.
3. **Patterns map to standards.** `data-bind` is just a `data-*` attribute. `state()` is just a `Proxy`. The agent already knows these primitives.

---

## The Stability Contract

Once v2.0.0 ships (no `-beta`, no `-alpha`), these contracts are **permanent**:

### Frozen Public API

```javascript
// These signatures will NEVER change
state(obj)                        → Proxy (reactive)
state(obj, options?)              → Proxy (options always optional)
proxy.$subscribe(key, fn)         → unsubscribe function
proxy[key] = value                → triggers reactivity
bindDom(root, store)              → cleanup function
bindDom(root, store, options?)    → cleanup function (options always optional)
effect(fn)                        → cleanup function
effect(fn, deps?)                 → cleanup function (deps always optional)
```

### Frozen DOM Contract

```html
<!-- These attribute names will NEVER change -->
data-bind="key"                   <!-- two-way binding -->
data-hidden="key"                 <!-- el.hidden = Boolean(val) -->
data-disabled="key"               <!-- el.disabled = Boolean(val) -->
data-checked="key"                <!-- el.checked = Boolean(val) -->
data-required="key"               <!-- el.required = Boolean(val) -->
data-aria-expanded="key"          <!-- aria-expanded="true"/"false" -->
data-aria-hidden="key"            <!-- aria-hidden="true"/"false" -->
```

### Rules for Future Versions

1. **New features** → addons or handler module, **never core**
2. **New options** → always optional, defaults match current behavior
3. **Deprecation** → warn for 2+ major versions before removal
4. **Core size** → must stay ≤2KB gzipped, forever
5. **No required build step** → must always work with plain `<script type="module">`

### What CAN Change

- Addons API (computed, watch, repeat, debug) — these are clearly marked as addons
- Handler module API — tree-shakeable, separate import
- Internal implementation details — performance improvements, refactors
- New addons/handlers — additions are not breaking changes
- Error message text — wording can improve
- TypeScript types — can become more specific (never less)

---

## Target Audience

| Who | Why Lume |
|-----|---------|
| **New developers** | Learn web standards, not framework abstractions |
| **Backend developers** | Add interactivity without learning React |
| **Indie hackers** | Ship fast, no 2GB node_modules |
| **Consultants / Agencies** | Long-term maintainability, no framework lock-in |
| **Widget/Embed developers** | Strict size budgets, can't control host page |
| **AI-assisted development** | Entire codebase fits in context, patterns are standard |

---

## Success Metrics

Lume.js succeeds when:

1. A developer can add reactivity to an HTML page in under 5 minutes
2. Code written in 2026 runs without changes in 2036
3. An AI agent generates correct Lume code without training on Lume-specific docs
4. The entire library can be understood by reading source (no "how does this work under the hood?" questions)
5. A team can adopt Lume without a meeting about it

---

## The Litmus Test

Before adding any feature, ask:

1. **Can this be done with existing web standards?** → If yes, don't add it.
2. **Does this require changing the core?** → If yes, almost certainly don't add it.
3. **Will this make sense in 10 years?** → If uncertain, don't add it.
4. **Can a junior developer understand this in 5 minutes?** → If no, simplify it.
5. **Does this increase core size beyond 2KB?** → If yes, it goes in an addon or it doesn't exist.
