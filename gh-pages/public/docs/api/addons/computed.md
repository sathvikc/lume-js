# computed(getter)

Creates a read-only reactive value that automatically updates when its dependencies change.

## Signature

```typescript
function computed<T>(getter: () => T): {
  value: T;
  subscribe: (callback: (val: T) => void) => () => void;
  dispose: () => void;
};
```

## Parameters

- `getter` (Function): A function that returns the computed value.

## Returns

An object with:
- `value` (Getter): The current computed value.
- `subscribe(callback)`: Subscribes to changes.
- `dispose()`: Stops the computation and frees memory.

## Description

`computed` values are cached. They only re-evaluate when their dependencies change.

## Example

```javascript
import { state } from 'lume-js';
import { computed } from 'lume-js/addons';

const store = state({
  price: 10,
  quantity: 2
});

const total = computed(() => store.price * store.quantity);

console.log(total.value); // 20

store.price = 20;
// total.value is now 40
```

---

**← Previous: [effect()](../core/effect.md)** | **Next: [repeat()](repeat.md) →**

> **Deep Dive:** Why is `computed` an addon? Read the [Design Decision](../../design/design-decisions.md#why-no-computed-properties-in-core).
