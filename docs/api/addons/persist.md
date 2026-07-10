# persist(store, storageKey, options?)

Keeps selected store keys in sync with `localStorage` (or any Storage-like object): hydrates them when called, then saves automatically on change.

## Signature

```ts
function persist(
  store: ReactiveState<any>,
  storageKey: string,
  options?: {
    keys?: string[];
    storage?: Pick<Storage, 'getItem' | 'setItem'> | null;
  }
): () => void
```

Imported from `lume-js/addons`.

## Parameters

- `store` — A reactive store created with `state()`.
- `storageKey` — The storage entry name to read/write (one JSON blob per `persist()` call).
- `options.keys` — Which keys to persist. Default: all own non-`$` keys of the store at call time.
- `options.storage` — `localStorage` (default), `sessionStorage`, or any object with `getItem`/`setItem`.

## Returns

A dispose function. Call it to stop watching and saving.

## Example

```js
import { state, bindDom } from 'lume-js';
import { persist } from 'lume-js/addons';

const store = state({
  todos: [],
  filter: 'all',
  draft: '',          // transient — excluded below
});

// Hydrates todos/filter from storage, then saves them on every change
const stop = persist(store, 'todo-app', { keys: ['todos', 'filter'] });

bindDom(document.body, store);
```

That replaces the usual hand-rolled pair of `JSON.parse(localStorage.getItem(...))` at startup and `localStorage.setItem(...)` sprinkled through every mutation site.

## Behavior

| Concern | Behavior |
|---------|----------|
| Hydration | Stored values are assigned **through the proxy**, so subscribers and DOM bindings see them like any other write |
| Unknown keys in storage | Ignored — only watched keys are ever assigned (stale storage can't inject state) |
| Save timing | Coalesced to **one** storage write per microtask, no matter how many keys changed |
| Unchanged data | Skipped — if the serialized snapshot equals what storage already holds, no write happens |
| Corrupted JSON | Console warning, starts fresh |
| Unserializable state (circular refs, etc.) | Console warning, save skipped |
| Quota exceeded / write failure | Console warning, app keeps running |
| No storage (SSR, locked-down browsers) | Console warning, persistence disabled, returned dispose is a safe no-op |
| `keys: []` | Respected — persists and hydrates nothing (only an *absent* option falls back to all keys) |
| Same `storageKey` managed twice | Console warning on the second `persist()` — instances would overwrite each other's data |

## Per-tab persistence

```js
persist(store, 'wizard-progress', { storage: sessionStorage });
```

## Multiple stores

Each call owns one storage entry — give each store its own key (a second `persist()` on an already-managed key logs a warning, since the instances would overwrite each other):

```js
persist(settingsStore, 'app:settings');
persist(cartStore, 'app:cart', { keys: ['items'] });
```

## What it doesn't do

- **No cross-tab sync** — it doesn't listen to the `storage` event. (Candidate for a future option.)
- **No serialization of functions/Symbols** — values pass through `JSON.stringify`; keep persisted keys to plain data.
- **No versioning/migrations** — pair it with [`hydrateState`](hydrateState.md)-style validation if your schema evolves: read, validate, then `persist()`.

## See also

- [hydrateState()](hydrateState.md) — initial state from server-rendered JSON
- [watch()](watch.md) — the manual building block this replaces

---

<!-- lume:nav -->
**← Previous: [repeat()](repeat.md)** | **Next: [createCleanupGroup()](createCleanupGroup.md) →**
<!-- /lume:nav -->
