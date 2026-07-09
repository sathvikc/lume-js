# on(...types)

Creates handlers for declarative event wiring: `data-on{type}="key"` attaches the function stored at that state key as a DOM event listener.

## Signature

```ts
function on(...types: string[]): Handler[]
```

Imported from `lume-js/handlers`. Returns an array — pass it directly to `handlers` (bindDom flattens one level).

## Example

```html
<input type="text" data-bind="newTitle" data-onkeydown="maybeSubmit">
<button data-onclick="addTodo">Add</button>
```

```js
import { state, bindDom } from 'lume-js';
import { on } from 'lume-js/handlers';

const store = state({
  newTitle: '',
  todos: [],
  addTodo() {
    if (!store.newTitle.trim()) return;
    store.todos = [...store.todos, { id: Date.now(), title: store.newTitle }];
    store.newTitle = '';
  },
  maybeSubmit(e) {
    if (e.key === 'Enter') store.addTodo();
  },
});

bindDom(document.body, store, { handlers: [on('click', 'keydown')] });
```

The behavior now lives in state and the wiring lives in HTML — no `getElementById` + `addEventListener` boilerplate, and the markup documents itself.

## Behavior

| Situation | Result |
|-----------|--------|
| Key holds a function | attached via `addEventListener(type, fn)`; receives the native event |
| Key assigned a *new* function | old listener removed, new one attached (no stacking) |
| Key assigned `null`/`undefined` | listener detached |
| Key assigned a truthy non-function | listener detached + console warning |

Nested paths work like any binding: `data-onclick="actions.save"` resolves `store.actions.save` (the nested object must be its own `state()` for reactive re-wiring, as usual).

## Security

Same trust model as `data-bind`: an injected `data-on*` attribute can only reference **functions that already exist in reachable state** — there is no expression language and no `eval`. Sanitize untrusted HTML before calling `bindDom`, as always.

## Cleanup

`bindDom`'s cleanup function stops future re-wiring but does not detach listeners already attached to elements still in the DOM. Discarding the bound subtree (normal SPA teardown) drops them with the elements.

## See also

- [Handlers API](../core/handlers.md)
- [bindDom()](../core/bindDom.md)
