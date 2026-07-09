# 07 — feat(handlers): `on()` — declarative event wiring via `data-on*`

| | |
|---|---|
| **Type** | Feature (handler, opt-in import) |
| **Files changed** | `src/handlers/on.js` (new), `src/handlers/index.js`, `src/handlers/index.d.ts` |
| **Tests** | `tests/handlers/index.test.js` → `describe('on factory')` (6 tests) |
| **API docs** | `docs/api/handlers/on.md` |
| **Breaking?** | No — new opt-in handler |
| **Size** | ~0.2 KB — and only if you import it |

## Why this exists

`VISION.md` lists `data-on` as a planned extended handler, and the verbosity
problem makes it obvious why. Every Lume example wires events like this:

```js
document.getElementById('add').addEventListener('click', () => { ... });
document.getElementById('clear').addEventListener('click', () => { ... });
// ...one block per button, querySelector soup, behavior far from markup
```

Frameworks won this argument with `onClick={...}` / `@click="..."` — but they
did it with custom syntax. Lume can do it with a **plain handler** on the
existing extensible-handler system: a `data-on*` attribute (valid HTML) whose
value is a state key holding a function. No new core code, no expression
language, no eval.

```html
<button data-onclick="addTodo">Add</button>
```

```js
import { on } from 'lume-js/handlers';

const store = state({
  todos: [],
  addTodo() {
    store.todos = [...store.todos, makeTodo()];
  },
});

bindDom(document.body, store, { handlers: [on('click')] });
```

## How it works

It is just a handler factory like `classToggle()` — `on('click', 'input')`
returns `{ attr, apply }` objects, and `bindDom` does what it always does:
resolves the key, subscribes, calls `apply(el, value)` with the current
value. The only novelty is that the value is a *function* and `apply`
attaches it as a listener:

- A module-level `WeakMap<element, Map<type, listener>>` remembers what was
  attached, so re-assigning the key **swaps** the listener instead of
  stacking a second one.
- Assigning `null`/`undefined` detaches. A truthy non-function detaches and
  logs a warning (you probably typo'd a key).
- The listener receives the native DOM event, untouched.

Functions-in-state is already a supported pattern (the `set` trap stores
them; `JSON.stringify` skips them) — this just gives it a declarative use.

## Reactive event handlers — for free

Because the wiring is a normal subscription, handlers are swappable at
runtime, which is genuinely hard with `addEventListener` by hand:

```js
store.onRowClick = editMode ? startEditing : showDetails;
// every data-onclick="onRowClick" element re-wires on the next flush
```

## Security model

Identical to `data-bind` (documented in `bindDom`'s `@security` note): an
attacker who can inject attributes can only point at functions **already in
reachable state**. There is no expression evaluation. The handler adds no new
capability beyond what injected `data-bind` already implied — but the API doc
spells it out anyway.

## Known limitation (documented)

`bindDom`'s cleanup stops future re-wiring but doesn't detach listeners from
elements that stay in the DOM — the handler contract has no teardown hook
(true of every stateful handler, e.g. a class left toggled). Elements
discarded with their subtree take their listeners with them. A
`handler.unbind` lifecycle is a possible future extension if real usage
demands it.

## How to verify

```bash
npx vitest run tests/handlers/index.test.js -t 'on factory'
```
