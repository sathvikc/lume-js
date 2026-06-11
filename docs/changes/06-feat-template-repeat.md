# 06 — feat(addons): template-driven `repeat()` — declarative lists, zero DOM code

| | |
|---|---|
| **Type** | Feature (addon, opt-in option) |
| **Files changed** | `src/addons/repeat.js`, `src/core/bindDom.js` (internal export), `src/addons/index.d.ts` |
| **Tests** | `tests/addons/repeat.test.js` → `describe('template mode')` (14 tests) |
| **Example** | `examples/template-list/` |
| **API docs** | `docs/api/addons/repeat.md` → "Pattern 0 — Template" |
| **Breaking?** | No — new option; all existing patterns unchanged |

## Why this exists

`VISION.md` names **code verbosity** as "the hardest problem Lume.js faces":
using `repeat()` meant writing imperative DOM code (`createElement`,
`innerHTML`, `querySelector().textContent = …`) for every row — often *more*
code than vanilla JS. The brainstorm seed in the vision doc asks: *"What if
`data-*` did more work?"*

This change answers with the platform's own templating primitive. The
`<template>` element is **the** web standard for exactly this job: valid
HTML anywhere, inert until cloned, supported everywhere Lume runs.

## Before / after

**Before** — structure built in JS, bound by hand:

```js
repeat('#list', store, 'people', {
  key: p => p.id,
  create: (p, el) => {
    const name = document.createElement('strong');
    name.className = 'name';
    el.appendChild(name);
    const city = document.createElement('span');
    city.className = 'city';
    el.appendChild(city);
  },
  update: (p, el) => {
    el.querySelector('.name').textContent = p.name;
    el.querySelector('.city').textContent = p.address.city;
  }
});
```

**After** — structure stays in HTML where it belongs:

```html
<ul id="list">
  <template>
    <li>
      <strong data-bind="name"></strong>
      <span data-bind="address.city"></span>
    </li>
  </template>
</ul>
```

```js
repeat('#list', store, 'people', { key: p => p.id, template: true });
```

No custom syntax was added: it's a standard `<template>`, standard
`data-bind` attributes, and HTML that passes validation — the row is even
visible to anyone reading the markup, which `createElement` code never is.

## API

`options.template` accepts:

| Value | Meaning |
|-------|---------|
| `true` | first `<template>` inside the container |
| `'#row-tpl'` (string) | CSS selector resolving to a `<template>` |
| `HTMLTemplateElement` | used directly |

Binding paths resolve against **each item** (not the store):

| Path | Resolves to |
|------|-------------|
| `data-bind="name"` | `item.name` |
| `data-bind="user.city"` | `item.user.city` (null-safe — missing segments bind as empty) |
| `data-bind="$item"` | the item itself — for primitive arrays like `['red', 'green']` |
| `data-bind="$index"` | the item's current index |

Value application is **shared with core**: `bindDom.js` now exports its
internal `applyBindValue(el, val)` (inputs → `.value`/`.checked`, everything
else → `textContent`), and template bindings call exactly that function — the
two can never drift apart. (Internal export only; not part of the package API.)

## Semantics & design decisions

- **One-way snapshot bindings.** Items are plain objects, not stores. Bindings
  re-apply when the list updates — update arrays immutably, as `repeat` always
  required. (Two-way per-row binding would require per-item stores: explicitly
  out of scope, consistent with "explicit nested states".)
- **Composes with `create`/`update`.** `create` still runs once per clone
  (attach listeners, return cleanup), `update` runs after the built-in binding
  for anything beyond it. `render` is **ignored with a warning** when a
  template is set (its do-everything contract conflicts with the built-in
  binding), and `element` is ignored (the root comes from the template).
- **Same skip optimization.** Bindings are skipped when the item reference and
  index are both unchanged — identical to the existing `update` rule, covered
  by a test. `$index` stays correct on reorders because a changed index defeats
  the skip.
- **Compiled once per clone.** `[data-bind]` nodes are collected and their
  paths split at clone time and cached per key; updates just walk the cached
  list. No `querySelectorAll` per update.
- **Exactly one root element** per template, enforced with a clear error —
  keyed reconciliation moves one node per item.

## How to verify

```bash
npx vitest run tests/addons/repeat.test.js -t 'template mode'
npm run dev   # → /examples/template-list/ — add, remove, shuffle
```
