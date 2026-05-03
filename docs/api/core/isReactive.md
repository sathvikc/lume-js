# isReactive(value)

Returns `true` if the value is a Lume reactive proxy created by `state()`.

## Signature

```ts
function isReactive(value: any): boolean;
```

## Parameters

- `value` — The value to check.

## Returns

`true` if the value is a reactive proxy created by `state()`, `false` otherwise.

## Example

```js
import { state, isReactive } from 'lume-js';

const raw = { count: 0 };
const store = state(raw);

isReactive(store); // true
isReactive(raw);   // false
```

This is useful when writing utilities or plugins that need to accept either a raw object or an already-reactive store without double-wrapping it.
