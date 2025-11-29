# watch(store, key, callback)

Watches a specific property on a state object for changes.

## Signature

```typescript
function watch(
  store: object, 
  key: string, 
  callback: (value: any) => void
): () => void;
```

## Parameters

- `store` (Object): The reactive state object.
- `key` (String): The property name to watch.
- `callback` (Function): Called with the new value.

## Returns

- An unsubscribe function.

## Description

`watch` is a convenience alias for `store.$subscribe(key, callback)`.

## Example

```javascript
import { state } from 'lume-js';
import { watch } from 'lume-js/addons';

const store = state({ count: 0 });

watch(store, 'count', (val) => {
  console.log('Count is now:', val);
});
```
