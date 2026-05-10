# hydrateState()

Reads initial state from a `<script type="application/json">` element embedded in server-rendered HTML.

## Signature

```ts
function hydrateState(selector?: string): object
```

Imported from `lume-js/addons`.

## Parameters

- `selector` — CSS selector for the script element. Defaults to `'#__LUME_DATA__'`.

## Returns

The parsed JSON object from the selected element, or an empty object `{}` if the element is not found or the JSON is invalid.

## Description

`hydrateState` enables SSR hydration: the server embeds the page's initial data as JSON in the HTML, and the client reads it to initialize reactive state without a separate API request.

**Server (any language/framework):**
```html
<script id="__LUME_DATA__" type="application/json">
  {"title": "Welcome", "user": "Ada", "count": 42}
</script>
```

**Client:**
```js
import { state, bindDom } from 'lume-js';
import { hydrateState } from 'lume-js/addons';

const store = state(hydrateState());
bindDom(document.body, store);
```

The store is initialized with `{ title: 'Welcome', user: 'Ada', count: 42 }` immediately — no async, no flash of empty content.

## Custom selector

Use a different selector when embedding multiple data blocks on one page:

```html
<script id="sidebar-data" type="application/json">{"open": false}</script>
<script id="cart-data"    type="application/json">{"items": [], "total": 0}</script>
```

```js
const sidebar = state(hydrateState('#sidebar-data'));
const cart    = state(hydrateState('#cart-data'));
```

## Safe fallback

`hydrateState` always returns an object. If the selector matches nothing, or the JSON is malformed, you get `{}` — which merges cleanly with default state:

```js
const store = state({
  count: 0,          // default
  ...hydrateState(), // server overrides
});
```

## Non-browser environments

When `document` is not defined (Node.js, Workers), `hydrateState` returns `{}` safely.

## See also

- [state()](../core/state.md)
- [createCleanupGroup()](createCleanupGroup.md)

---

**← Previous: [createCleanupGroup()](createCleanupGroup.md)** | **Next: [repeat()](repeat.md) →**
