# watch(store, key, fn, options?)

Subscribes to a single store key. More explicit than `effect` — no auto-tracking, and the callback always receives the new value directly.

## Signature

```ts
function watch(
  store: object,
  key: string,
  fn: (newValue: any) => void,
  options?: { immediate?: boolean }
): () => void
```

Imported from `lume-js/addons`.

## Parameters

- `store` — A reactive store created by `state()`.
- `key` — The property name to watch.
- `fn` — Called with the new value on every change.
- `options.immediate` — Whether to call `fn` immediately with the current value (default: `true`).

## Returns

An unsubscribe function. Call it to stop watching.

## Examples

### Basic

```js
import { state } from 'lume-js';
import { watch } from 'lume-js/addons';

const store = state({ theme: 'light', count: 0 });

watch(store, 'theme', (newTheme) => {
  document.documentElement.dataset.theme = newTheme;
});
// Called immediately with 'light', then again on every change

store.theme = 'dark'; // callback fires with 'dark'
```

### One-time watcher

```js
const stop = watch(store, 'count', (val) => {
  if (val >= 10) {
    console.log('Reached 10!');
    stop(); // unsubscribe after the condition is met
  }
});
```

### Side effects (localStorage, analytics)

`watch` is the right tool for side effects that should react to exactly one key. Unlike auto-tracking `effect`, there is no risk of accidentally subscribing to extra keys.

```js
watch(store, 'theme', (theme) => {
  localStorage.setItem('theme', theme);
});

watch(store, 'userId', (id) => {
  analytics.identify(id);
});
```

### Skip the initial call with `{ immediate: false }`

By default `watch` fires immediately so you get the current value on subscribe. Pass `{ immediate: false }` to only react to future changes.

```js
// fires immediately with current value, then on every change
watch(store, 'count', (val) => console.log('count:', val));

// only fires on future changes — initial value is NOT logged
watch(store, 'count', (val) => {
  sendAnalytics('count_changed', val);
}, { immediate: false });
```

## Compared to `effect`

| | `effect(fn)` | `watch(store, key, fn)` |
|--|--------------|------------------------|
| Dependency tracking | Auto — all reads inside fn | Explicit — one key only |
| Callback args | none | `(newValue)` |
| Runs immediately | Yes (on first call) | Yes (always, on subscribe) |
| Best for | UI bindings, rendering | Side effects, persistence |

## See also

- [effect()](../core/effect.md)
- [computed()](computed.md)

---

<!-- lume:nav -->
**← Previous: [batch()](../core/batch.md)** | **Next: [computed()](computed.md) →**
<!-- /lume:nav -->
