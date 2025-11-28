# isReactive(value)

Checks if a value is a Lume reactive proxy.

## Signature

```typescript
function isReactive(value: any): boolean;
```

## Parameters

- `value` (any): The value to check.

## Returns

- `true` if the value is a reactive proxy created by `state()`.
- `false` otherwise.

## Example

```javascript
import { state, isReactive } from 'lume-js';

const raw = { count: 0 };
const store = state(raw);

isReactive(store); // true
isReactive(raw);   // false
```
