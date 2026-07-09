# The Universal Core (`lume-js/state`)

Lume's kernel — `state()`, `batch()`, `withReadObserver()` — has no DOM
dependency at all. The `lume-js/state` entry ships exactly that kernel:
**1.45 KB gzipped**, runs in Node, Deno, Bun, workers, CLI tools, and
browsers alike.

```js
import { state, batch } from 'lume-js/state';
```

If you're building for the browser and want DOM binding, use the full core
instead — same `state`, plus `bindDom` and `effect`:

```js
import { state, bindDom, effect, batch } from 'lume-js';   // 2.66 KB
```

Both entries share one implementation — `lume-js/state` is not a fork, it's
a smaller slice of the same modules.

## A complete Node example

Save as `watcher.mjs` and run with `node watcher.mjs` — no DOM, no build:

```js
import { state, batch } from 'lume-js/state';

// Reactive state on the server: a build pipeline's status
const build = state({
  step: 'idle',
  filesDone: 0,
  filesTotal: 0,
  errors: 0,
});

// Subscriptions work exactly as in the browser
build.$subscribe('step', step => {
  console.log(`→ ${step}`);
});

const progress = () =>
  build.filesTotal > 0
    ? `${build.filesDone}/${build.filesTotal}`
    : 'n/a';

// Simulate a pipeline
build.step = 'compiling';
batch(() => {
  build.filesTotal = 120;
  build.filesDone = 0;
});

for (let i = 1; i <= 120; i++) {
  build.filesDone = i;   // microtask-batched: no log spam, final value wins
}
build.step = 'done';

queueMicrotask(() => {
  console.log(`finished: ${progress()}, errors: ${build.errors}`);
});
```

## Why `batch()` shines outside the browser

In the browser, microtask batching usually does the right thing on its own.
In **tests and server code**, you often want the flush to have happened *on
the next line* — that's exactly what `batch()` guarantees:

```js
import { state, batch } from 'lume-js/state';
import assert from 'node:assert';

const order = state({ items: 0, total: 0 });
const audit = [];
order.$subscribe('total', t => audit.push(t));

batch(() => {
  order.items = 3;
  order.total = 42;
});

// No `await Promise.resolve()` dance — the flush already ran:
assert.deepStrictEqual(audit, [0, 42]);
```

## What's *not* in the kernel

| Not included | Why | Where it lives |
|--------------|-----|----------------|
| `bindDom` | DOM-only by definition | `lume-js` |
| `effect` | auto-tracking is a UI-leaning pattern; in server code, explicit `$subscribe` is usually clearer | `lume-js` |
| addons (`computed`, `watch`, `persist`, …) | optional patterns | `lume-js/addons` |

Note that `watch()` and `computed()` from `lume-js/addons` are themselves
DOM-free and work fine in Node — they're just not part of the 1.45 KB
kernel. (`computed` pulls in `effect` internally.)

## Building reactive primitives on the kernel

`withReadObserver(onRead, fn)` is the seam `effect()` itself is built on —
it reports every store read during `fn`'s synchronous execution. If you're
building your own primitive (a memo, a logger, a dependency visualizer), you
get the same machinery the library uses:

```js
import { state, withReadObserver } from 'lume-js/state';

const store = state({ a: 1, b: 2 });

const deps = [];
const sum = withReadObserver(
  (proxy, key) => deps.push(key),
  () => store.a + store.b
);

console.log(sum, deps);   // 3, ['a', 'b']
```

## CDN usage (no npm, no build)

```html
<script type="module">
  import { state, batch } from 'https://cdn.jsdelivr.net/npm/lume-js/dist/state.min.mjs';
</script>
```

## Size accounting

| Entry | Gzipped | CI budget |
|-------|---------|-----------|
| `lume-js/state` (`dist/state.min.mjs`) | 1.45 KB | ≤ 1.75 KB |
| `lume-js` (`dist/index.min.mjs`) | 2.66 KB | ≤ 3 KB |

Both numbers are enforced by `scripts/check-size.js` on every CI run — they
can't silently drift.

## See also

- [state()](../api/core/state.md) · [batch()](../api/core/batch.md)
- [SSR & Hydration](ssr-hydration.md) — server-rendered HTML with reactive hydration
- Design rationale: [Why a `lume-js/state` entry](../design/design-decisions.md#why-a-lume-jsstate-entry-instead-of-demoting-binddomeffect-v23)

---

**← Previous: [How reactivity works](reactivity.md)** | **Next: [Choosing reactive primitives](choosing-reactive-primitives.md) →**
