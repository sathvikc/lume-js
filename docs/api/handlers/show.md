# show

Hides or shows an element based on a store value. When the value is truthy, the element is visible. When falsy, it gets `hidden = true`. This is the inverse of the built-in `data-hidden` attribute.

## Attribute

`data-show="key"`

## Import

```js
import { show } from 'lume-js/handlers';
```

## Usage

```js
import { state, bindDom } from 'lume-js';
import { show } from 'lume-js/handlers';

const store = state({ loggedIn: false, loading: true });

bindDom(document.body, store, { handlers: [show] });
```

```html
<nav data-show="loggedIn">
  <a href="/dashboard">Dashboard</a>
  <a href="/settings">Settings</a>
</nav>

<div class="spinner" data-show="loading">Loading…</div>
```

When `store.loggedIn` is `false`, the nav gets `hidden` set to `true`. When it becomes truthy, `hidden` is set to `false` and the element is shown.

## Behavior

| Value | Effect |
|-------|--------|
| Truthy | `el.hidden = false` (element shown) |
| Falsy (`false`, `null`, `0`, `''`) | `el.hidden = true` (element hidden) |

This uses the native `hidden` attribute mechanism, not inline `style.display`.

## Compared to `data-hidden`

`bindDom` has a built-in `data-hidden` attribute that sets `el.hidden = Boolean(val)`. The difference:

| | `data-show` | `data-hidden` |
|--|-------------|---------------|
| Value meaning | truthy = visible | truthy = hidden |
| Mechanism | `hidden` attribute | `hidden` attribute |
| Import required | Yes | No |

Use `data-show` when the condition is already in "visible" form (`isLoggedIn`, `hasResults`). Use `data-hidden` when it's in "hidden" form (`isLoading`, `isEmpty`).

## See also

- [classToggle](classToggle.md)
- [Handlers guide](../../guides/handlers.md)
- [bindDom()](../core/bindDom.md)

---

**← Previous: [Handlers API](../core/handlers.md)** | **Next: [className](className.md) →**
