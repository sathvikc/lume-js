# Installation

Lume.js ships as ES modules with TypeScript declarations. The simplest way to get started is a CDN import — no npm, no build tool, nothing to install. If your project already uses a bundler, npm works too.

## Via CDN — no build step

Drop a `<script type="module">` into any HTML file and you're done:

```html
<script type="module">
  import { state, bindDom, effect } from 'https://cdn.jsdelivr.net/npm/lume-js@2.0.0-beta.1/src/index.js';
</script>
```

### Pin the version

For production, pin to an exact version so your page can't break on a new release. The `@next` tag always resolves to the latest beta; omitting a tag gives the latest stable.

```html
<!-- exact version (recommended for production) -->
'https://cdn.jsdelivr.net/npm/lume-js@2.0.0-beta.1/src/index.js'

<!-- latest stable -->
'https://cdn.jsdelivr.net/npm/lume-js/src/index.js'

<!-- latest beta -->
'https://cdn.jsdelivr.net/npm/lume-js@next/src/index.js'
```

### Import map (recommended for CDN projects)

If your page imports from more than one Lume subpath, an import map removes the long URLs from your code and keeps everything readable:

```html
<script type="importmap">
{
  "imports": {
    "lume-js":          "https://cdn.jsdelivr.net/npm/lume-js@2.0.0-beta.1/src/index.js",
    "lume-js/addons":   "https://cdn.jsdelivr.net/npm/lume-js@2.0.0-beta.1/src/addons/index.js",
    "lume-js/handlers": "https://cdn.jsdelivr.net/npm/lume-js@2.0.0-beta.1/src/handlers/index.js"
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
npm install lume-js@next
# or
pnpm add lume-js@next
# or
yarn add lume-js@next
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
| `lume-js` | `state`, `bindDom`, `effect` |
| `lume-js/addons` | `watch`, `computed`, `repeat`, `withPlugins`, `createDebugPlugin`, `debug`, `isReactive`, `defaultFocusPreservation`, `defaultScrollPreservation` |
| `lume-js/handlers` | `show`, `classToggle`, `stringAttr`, `boolAttr`, `ariaAttr`, `htmlAttrs`, `formHandlers`, `a11yHandlers` |

## Browser support

Lume targets evergreen browsers: Chrome 49+, Firefox 18+, Safari 10+, Edge 79+. IE11 is **not** supported. Lume uses `Proxy` for reactivity, and `Proxy` cannot be polyfilled.

## TypeScript

Type declarations ship with the package — no separate `@types/` install needed. Stores infer their shape from the object you pass to `state()`:

```ts
import { state } from 'lume-js';

const store = state({ count: 0, name: 'Ada' });
store.count = 'two'; // ✗ Type 'string' is not assignable to type 'number'
store.unknown;       // ✗ Property 'unknown' does not exist
```

---

**← Previous: [Introduction](../README.md)** | **Next: [Quick start](quick-start.md) →**
