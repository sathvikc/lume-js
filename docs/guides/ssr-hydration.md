# SSR & Hydration

Lume has no compiler, no virtual DOM, and no server-side rendering framework. But it **is** hydration-friendly: you can render static HTML on the server and bind Lume to it on the client.

## How It Works

`bindDom()` calls `$subscribe()` immediately with the current value. If the server-rendered text already matches the store, there is no visible flash.

```html
<!-- Server renders static HTML with data-* attributes -->
<div id="app">
  <h1 data-bind="title">Welcome to My App</h1>
  <span data-bind="count">0</span>
  <button data-disabled="isLoading">Submit</button>
</div>

<script type="module">
  import { state, bindDom } from 'lume-js';

  const store = state({
    title: 'Welcome to My App',
    count: 0,
    isLoading: false
  });

  bindDom(document.getElementById('app'), store);
  <!-- Elements already have correct content — no flash -->
</script>
```

## Passing Initial State from Server

Embed the server state as JSON in the HTML:

```html
<script id="__LUME_DATA__" type="application/json">
  {"title": "Welcome", "count": 42}
</script>

<script type="module">
  import { state, bindDom } from 'lume-js';
  import { hydrateState } from 'lume-js/addons';

  const store = state(hydrateState());
  bindDom(document.getElementById('app'), store);
</script>
```

`hydrateState(selector)` reads a `<script type="application/json">` element, parses it, and returns the object. It falls back to `{}` if the element is missing or contains invalid JSON.

You can also do it manually without the addon:

```js
const raw = document.getElementById('__LUME_DATA__')?.textContent;
const initial = raw ? JSON.parse(raw) : {};
const store = state(initial);
```

## What Lume Does NOT Do

- No server-side JavaScript execution — that's your framework's job (Express, Django, etc.)
- No virtual DOM diffing or hydration mismatch detection
- No hydration reconciliation — if the server HTML differs from the store, the store wins

## Progressive Enhancement

Because content is in the HTML from the start, the page is readable before JavaScript loads. If JS fails entirely, the static content is still there.

## SEO

Crawlers see the server-rendered HTML. No special rendering mode needed.

---

<!-- lume:nav -->
**← Previous: [Cleanup & Dispose](cleanup-and-dispose.md)** | **Next: [state()](../api/core/state.md) →**
<!-- /lume:nav -->
