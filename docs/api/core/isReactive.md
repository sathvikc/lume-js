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

`true` if the value has a `$subscribe` method (duck-typing), `false` otherwise.

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

Detection uses duck-typing (`typeof obj.$subscribe === 'function'`). Any object with a `$subscribe` method will pass this check.
