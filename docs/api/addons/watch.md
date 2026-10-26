# watch(store, key, fn, options?)

Subscribes to a single store key. More explicit than `effect` — no auto-tracking, and the callback receives the new value and the previous one directly.

## Signature

```ts
function watch(
  store: object,
  key: string,
  fn: (newValue: any, previousValue: any) => void,
  options?: { immediate?: boolean }
): () => void
```

Imported from `lume-js/addons`.

## Parameters

- `store` — A reactive store created by `state()`.
- `key` — The property name to watch.
- `fn` — Called with `(newValue, previousValue)` on every change. `previousValue` is the value this watcher last received: `undefined` on the immediate call, and the subscribe-time value on the first change when `immediate` is `false`. Writes are coalesced per flush (and per `batch()`), so it is the last *delivered* value, not every intermediate assignment.
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

### Transitions with the previous value

```js
watch(store, 'status', (status, prev) => {
  if (prev === 'loading' && status === 'error') showRetry();
});
```

`watch` fires only when the key itself is assigned. If the key holds a nested `state()` object, editing a field inside it (`store.user.name = 'B'`) does not fire a watcher on `'user'`; replacing it (`store.user = state({...})`) does, with the old object as `prev`.

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
| Callback args | none | `(newValue, previousValue)` |
| Runs immediately | Yes (on first call) | Yes (always, on subscribe) |
| Best for | UI bindings, rendering | Side effects, persistence |

## See also

- [effect()](../core/effect.md)
- [computed()](computed.md)

---

<!-- lume:nav -->
**← Previous: [batch()](../core/batch.md)** | **Next: [computed()](computed.md) →**
<!-- /lume:nav -->
