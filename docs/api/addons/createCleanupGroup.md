# createCleanupGroup()

Creates a cleanup group that collects multiple cleanup/unsubscribe functions and disposes them all at once.

## Signature

```ts
function createCleanupGroup(): {
  add(fn: () => void): void;
  dispose(): void;
}
```

Imported from `lume-js/addons`.

## Returns

An object with:
- `add(fn)` — Registers a cleanup function. Non-functions are silently ignored.
- `dispose()` — Calls all registered cleanup functions in reverse order, then clears the group.

## Description

`createCleanupGroup` solves the problem of tracking many cleanup functions across a component or view lifecycle. Each Lume primitive returns an unsubscribe/cleanup function — `bindDom`, `effect`, `watch`, `computed`, `store.$subscribe`. Instead of keeping references to each individually, add them to a group and call `dispose()` once.

```js
import { state, bindDom, effect } from 'lume-js';
import { createCleanupGroup, watch } from 'lume-js/addons';

const store = state({ name: 'World', count: 0 });
const group = createCleanupGroup();

group.add(bindDom(document.body, store));
group.add(effect(() => { store.doubled = store.count * 2; }));
group.add(watch(store, 'count', val => localStorage.setItem('count', val)));

// Later — dispose everything at once
group.dispose();
```

## Component teardown

The most common use case is tearing down all reactivity when a view or component is removed:

```js
function mountUserCard(container, store) {
  const group = createCleanupGroup();

  group.add(bindDom(container, store));
  group.add(store.$subscribe('profile', render));

  return () => group.dispose(); // return teardown function
}

const teardown = mountUserCard(el, store);
// When the component unmounts:
teardown();
```

## Error handling

Errors thrown by individual cleanup functions are caught and swallowed so that one broken cleanup does not prevent the others from running.

## See also

- [effect()](../core/effect.md)
- [watch()](watch.md)
- [bindDom()](../core/bindDom.md)
- [Cleanup & Disposal guide](../../guides/cleanup-and-dispose.md)

---

<!-- lume:nav -->
**← Previous: [persist()](persist.md)** | **Next: [hydrateState()](hydrateState.md) →**
<!-- /lume:nav -->
