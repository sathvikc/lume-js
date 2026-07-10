# Installation

Lume.js ships as ES modules with TypeScript declarations. The simplest way to get started is a CDN import — no npm, no build tool, nothing to install. If your project already uses a bundler, npm works too.

## Via CDN — no build step

Drop a `<script type="module">` into any HTML file and you're done:

```html
<script type="module">
  import { state, bindDom, effect } from 'https://cdn.jsdelivr.net/npm/lume-js/dist/index.min.mjs';
</script>
```

### Pin the version

For production, pin to an exact version so your page can't break on a new release. Omitting a tag gives the latest stable.

```html
<!-- exact version (recommended for production) -->
<!-- lume:pin-url -->
'https://cdn.jsdelivr.net/npm/lume-js@2.3.1/dist/index.min.mjs'
<!-- /lume:pin-url -->

<!-- latest stable -->
'https://cdn.jsdelivr.net/npm/lume-js/dist/index.min.mjs'
```

### Import map (recommended for CDN projects)

If your page imports from more than one Lume subpath, an import map removes the long URLs from your code and keeps everything readable:

```html
<script type="importmap">
{
  "imports": {
    "lume-js":          "https://cdn.jsdelivr.net/npm/lume-js/dist/index.min.mjs",
    "lume-js/addons":   "https://cdn.jsdelivr.net/npm/lume-js/dist/addons.min.mjs",
    "lume-js/handlers": "https://cdn.jsdelivr.net/npm/lume-js/dist/handlers.min.mjs"
  }
}
</script>
<script type="module">
  import { state, bindDom } from 'lume-js';
  import { watch, computed } from 'lume-js/addons';
  import { classToggle }    from 'lume-js/handlers';
</script>
```

## Via npm

If you're working in a project with a bundler (Vite, Rollup, esbuild, webpack):

```bash
npm install lume-js
# or
pnpm add lume-js
# or
yarn add lume-js
```

Then import as usual:

```js
import { state, bindDom } from 'lume-js';
import { watch, computed } from 'lume-js/addons';
import { show, classToggle, stringAttr } from 'lume-js/handlers';
```

## Package exports

| Subpath | What's inside |
|---------|---------------|
| `lume-js` | `state`, `bindDom`, `effect`, `batch` |
| `lume-js/state` | `state`, `batch`, `withReadObserver` — DOM-free universal kernel |
| `lume-js/addons` | `watch`, `computed`, `repeat`, `persist`, `hydrateState`, `createCleanupGroup`, `withPlugins`, `createDebugPlugin`, `debug`, `isReactive`, `defaultFocusPreservation`, `defaultScrollPreservation` |
| `lume-js/handlers` | `show`, `className`, `classToggle`, `stringAttr`, `boolAttr`, `ariaAttr`, `on`, `htmlAttrs`, `formHandlers`, `a11yHandlers` |

## Browser support

Lume targets evergreen browsers: Chrome <!-- lume:browser-chrome -->80+<!-- /lume:browser-chrome -->, Firefox <!-- lume:browser-firefox -->74+<!-- /lume:browser-firefox -->, Safari <!-- lume:browser-safari -->13.1+<!-- /lume:browser-safari -->, Edge <!-- lume:browser-edge -->80+<!-- /lume:browser-edge --> (the source uses ES2020 syntax — optional chaining, nullish coalescing — shipped un-transpiled). IE11 is **not** supported. Lume uses `Proxy` for reactivity, and `Proxy` cannot be polyfilled.

## TypeScript

Type declarations ship with the package — no separate `@types/` install needed. Stores infer their shape from the object you pass to `state()`:

```ts
import { state } from 'lume-js';

const store = state({ count: 0, name: 'Ada' });
store.count = 'two'; // ✗ Type 'string' is not assignable to type 'number'
store.unknown;       // ✗ Property 'unknown' does not exist
```

---

<!-- lume:nav -->
**← Previous: [Introduction](../README.md)** | **Next: [Quick start](quick-start.md) →**
<!-- /lume:nav -->
