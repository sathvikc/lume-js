# 01 — fix(core): effect auto-tracking collides across stores

| | |
|---|---|
| **Type** | Bug fix (critical) |
| **Files changed** | `src/core/effect.js` |
| **Tests** | `tests/core/effect.test.js` → `describe('cross-store tracking')` |
| **Breaking?** | No — strictly fixes broken behavior |

## The bug

When an effect read **the same property name on two different stores**, only the
*first* store was subscribed. Changes to the second store never re-ran the effect.

```js
import { state, effect } from 'lume-js';

const price = state({ value: 100 });
const quantity = state({ value: 2 });

effect(() => {
  document.title = `Total: ${price.value * quantity.value}`;
});

price.value = 200;    // ✅ effect re-runs (title updates)
quantity.value = 5;   // ❌ BEFORE THIS FIX: nothing happens — silently broken
```

This is one of the most natural things to write in a multi-store app, and it
failed silently — no warning, no error, the effect just never fired.

## Root cause

During an effect run, every property read is reported to the effect so it can
subscribe exactly once per dependency. The "have I already subscribed?" check
used a plain object keyed **by property name only**:

```js
// BEFORE — src/core/effect.js
tracking: {}
// ...
if (myContext.tracking[key]) return;   // "value" already seen → skip storeB!
myContext.tracking[key] = true;
```

After reading `price.value`, the key `"value"` was marked as tracked — so the
subsequent read of `quantity.value` was skipped entirely. The store identity
was never part of the check.

## The fix

Track dependencies **per store proxy** using a `WeakMap` keyed by the proxy,
holding a `Set` of seen keys for that specific store:

```js
// AFTER — src/core/effect.js
tracking: new WeakMap()   // WeakMap<storeProxy, Set<key>>
// ...
let keys = myContext.tracking.get(proxy);
if (!keys) {
  keys = new Set();
  myContext.tracking.set(proxy, keys);
}
if (keys.has(key)) return;  // dedupe only within the SAME store
keys.add(key);
```

Now `(price, "value")` and `(quantity, "value")` are distinct dependencies,
while repeated reads of the *same* key on the *same* store are still
deduplicated (no duplicate subscriptions).

`WeakMap` is deliberate: the tracking map is rebuilt on every effect run and
holds store proxies as keys — weak references mean a discarded store can be
garbage-collected even if an effect context is still referenced somewhere.

## Why a `WeakMap` per run (cost note)

The map is allocated once per effect *execution* (not per read), same as the
old `{}` object. Per-read cost is one `WeakMap.get` + one `Set.has` — both
O(1). No measurable regression in the core benchmarks.

## How to verify

```bash
npx vitest run tests/core/effect.test.js -t 'cross-store'
```

Or by hand: run the example at the top of this document — after the fix, both
mutations update the title.
