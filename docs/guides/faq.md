# FAQ

## Is Lume.js production-ready?

Lume 2.x is currently in beta. The core API (`state`, `bindDom`, `effect`) and all addons (`watch`, `computed`, `repeat`) are stable. The 1.x series is also stable and used in production.

## Does Lume work without a build step?

Yes — that's one of its main advantages. Import from a CDN and write plain JavaScript:

```html
<script type="module">
  import { state, bindDom, effect } from 'https://cdn.jsdelivr.net/npm/lume-js/src/index.js';
</script>
```

No bundler, no npm, no config.

## Does Lume support TypeScript?

Yes. Types are included in the package. No `@types/` install needed.

## Can I use Lume with an existing server-rendered page?

Yes — that's a primary use case. Attach `bindDom` to any element on the page and the rest of the page is untouched:

```js
const store = state({ open: false });
bindDom(document.getElementById('nav'), store);
```

## How does Lume compare to Alpine.js?

Both work inline with server-rendered HTML. Lume uses standard `data-*` attributes; Alpine uses `x-*` directives with a custom expression syntax. Lume is smaller (~2.4 KB vs ~15 KB gzipped) and has no custom expression evaluator — logic lives in plain JS, not attribute strings.

## How does Lume compare to Vue 3's reactivity?

Lume's core reactivity (`state`, `effect`, `watch`, `computed`) is conceptually similar to Vue's `reactive`/`watchEffect`/`watch`/`computed`. The main difference is that Lume has no component model or template compiler — it binds directly to the DOM via `data-*` attributes.

## Can I use `Map` or `Set` in state?

No. The Proxy only intercepts plain object and array operations. Use plain arrays instead of `Set`, and objects with string keys instead of `Map`.

```js
// Not reactive
const store = state({ tags: new Set(['js', 'css']) });

// Use an array
const store = state({ tags: ['js', 'css'] });
```

## Why does my effect run more than I expect?

Effects re-run for every key they read. If you read `store.a` and `store.b` inside one effect, it re-runs when either changes. Use `watch(store, 'key', fn)` when you need to react to exactly one key, or use `computed` to derive a single value that the effect reads.

## How do I do conditional rendering?

The simplest way is `data-show` or `data-hidden`. Note that `data-show` requires opting in to the `show` handler — it is not built into `bindDom` by default:

```js
import { state, bindDom } from 'lume-js';
import { show } from 'lume-js/handlers';

const store = state({ isLoggedIn: false });
bindDom(document.body, store, { handlers: [show] });
```

```html
<div data-show="isLoggedIn">Welcome back!</div>
<div data-hidden="isLoggedIn">Please log in.</div>
```

For replacing entire sections, assign `innerHTML` inside an `effect`:

```js
effect(() => {
  outlet.innerHTML = store.page === 'home' ? homeHTML : aboutHTML;
});
```

## Does Lume support async effects?

`effect` itself is synchronous — it runs its function immediately and tracks dependencies. For async work, trigger it from a `watch` callback:

```js
watch(store, 'userId', async (id) => {
  const user = await fetch(`/api/users/${id}`).then(r => r.json());
  store.userName = user.name;
});
```

## How do I share state between multiple `bindDom` calls?

Pass the same store object to each call:

```js
const store = state({ count: 0, theme: 'light' });

bindDom(document.getElementById('header'), store);
bindDom(document.getElementById('main'), store);
bindDom(document.getElementById('footer'), store);
```

All three subtrees share the same reactive store. A write in one subtree updates all of them.

## Can I have multiple independent stores?

Yes — create as many `state()` objects as you need:

```js
const userStore = state({ name: 'Ada', role: 'admin' });
const cartStore = state({ items: [], total: 0 });

bindDom(document.getElementById('user-panel'), userStore);
bindDom(document.getElementById('cart'), cartStore);
```

## How do I clean up when removing a component?

Call the cleanup function returned by `bindDom` and dispose any effects:

```js
const cleanup = bindDom(el, store);
const stopEffect = effect(() => { /* … */ });

// When tearing down:
cleanup();
stopEffect();
```

---

**← Previous: [Changelog](../../CHANGELOG.md)**
