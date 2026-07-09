# isReactive(value)

Returns `true` if the value is a Lume reactive proxy created by `state()`.

> **Import path changed in v2.0.0:** `isReactive` moved from `lume-js` to `lume-js/addons`.

## Signature

```ts
function isReactive(value: any): boolean;
```

## Parameters

- `value` — The value to check.

## Returns

`true` if the value carries the Lume reactive brand (a registry symbol stamped by `state()`), or — as a compatibility fallback — has a `$subscribe` method. `false` otherwise.

## Example

```js
import { state } from 'lume-js';
import { isReactive } from 'lume-js/addons';

const store = state({ count: 0 });

isReactive(store); // true
isReactive({});    // false
```

This is useful when writing utilities or addons that need to accept either a raw object or an already-reactive store without double-wrapping it.

## Note

Detection checks the shared brand symbol first (`Symbol.for('lume.reactive')`, checked with the `in` operator so it never registers an effect dependency), then falls back to duck-typing (`typeof obj.$subscribe === 'function'`) for stores created by older lume-js versions. The brand is a type tag, not a security boundary — any code can stamp it.
