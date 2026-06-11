# 08 — feat(addons): `persist()` — localStorage/sessionStorage sync

| | |
|---|---|
| **Type** | Feature (addon, opt-in import) |
| **Files changed** | `src/addons/persist.js` (new), `src/addons/index.js`, `src/addons/index.d.ts` |
| **Tests** | `tests/addons/persist.test.js` (15 tests) |
| **API docs** | `docs/api/addons/persist.md` |
| **Breaking?** | No — new opt-in addon |
| **Size** | ~0.5 KB, matching the VISION.md estimate — only if imported |

## Why this exists

`VISION.md` lists it in the near-term addon roadmap ("Persistence —
localStorage/sessionStorage sync — ~500B"), and the repo's own todo example
shows the boilerplate it kills:

```js
// BEFORE — every app hand-rolls this pair
const persisted = JSON.parse(localStorage.getItem('lume_todos') || 'null');
const store = state({ todos: persisted?.todos ?? [], filter: persisted?.filter ?? 'all' });
// ...plus a save call threaded through every mutation site,
// plus try/catch for quota and corrupted JSON, plus...
```

```js
// AFTER
import { persist } from 'lume-js/addons';

const store = state({ todos: [], filter: 'all', draft: '' });
persist(store, 'todo-app', { keys: ['todos', 'filter'] });
```

## Design decisions

- **Hydrates through the proxy.** Stored values are assigned as normal
  writes, so subscribers, effects, and `data-bind` bindings all see them.
  No special "hydration mode".
- **Allowlist, not storage-driven.** Only *watched* keys are ever assigned
  from storage. A stale or tampered storage entry cannot inject keys the app
  didn't ask for (and the core `set` trap independently blocks
  `__proto__`-style keys as of v2.2.1).
- **One write per microtask.** Saves coalesce: ten writes in one tick produce
  one `setItem`. The serialized snapshot is also compared against what
  storage already holds, so unchanged flushes — including the post-hydration
  echo — produce **zero** writes. The tests assert exact write counts.
- **Never throws after setup.** Corrupted JSON → warn + start fresh.
  Circular state → warn + skip save. Quota exceeded → warn + keep running.
  No storage at all (SSR) → warn once + no-op dispose. Persistence is a
  convenience; it must never take the app down.
- **`$`-prefixed meta keys are never persisted** (the default key list
  filters them; `$subscribe`/`$beforeFlush` are enumerable on the raw object).

## Edge cases covered by tests

input validation · hydration · allowlist enforcement · write coalescing ·
unchanged-snapshot skip (echo) · `keys` subset · `$`-key exclusion · custom
storage object · SSR/no-storage · corrupted JSON · non-object stored values ·
unserializable state · quota failure · dispose (both before the store flush
and with a save already queued)

## Future candidates (not in this change)

Cross-tab sync via the `storage` event, debounce-by-time for very hot keys,
and schema versioning hooks. All can be added without breaking this API.

## How to verify

```bash
npx vitest run tests/addons/persist.test.js
```
