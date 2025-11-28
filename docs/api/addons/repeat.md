# repeat(container, store, key, options)

Efficiently renders a list of items based on an array in the state.

## Signature

```typescript
function repeat(
  container: HTMLElement | string,
  store: object,
  key: string,
  options: {
    key: (item: any) => any;
    render: (item: any, el: HTMLElement, index: number) => void;
    update?: (item: any, el: HTMLElement, index: number) => void;
    tag?: string;
  }
): () => void;
```

## Parameters

- `container`: The DOM element (or selector string) to render into.
- `store`: The reactive state object.
- `key`: The property name of the array in the state.
- `options`:
    - `key` (Function): Returns a unique ID for each item. **Critical for performance.**
    - `render` (Function): Called to create/initialize a DOM element for a new item.
    - `update` (Function, optional): Called when an existing item's data changes.
    - `tag` (String, optional): The HTML tag to use for items (default: `div`).

## Returns

- A cleanup function.

## Description

`repeat` synchronizes a DOM list with an array in your state. It uses the `key` function to track item identity, ensuring that DOM elements are reused, reordered, or removed efficiently rather than re-rendered from scratch.

**Important:** You must use **immutable updates** for the array (e.g., `store.items = [...newItems]`) for `repeat` to detect changes.

## Example

```javascript
import { state } from 'lume-js';
import { repeat } from 'lume-js/addons';

const store = state({
  users: [
    { id: 1, name: 'Alice' },
    { id: 2, name: 'Bob' }
  ]
});

repeat('#user-list', store, 'users', {
  key: user => user.id,
  render: (user, el) => {
    el.textContent = user.name;
    el.onclick = () => alert(user.name);
  },
  update: (user, el) => {
    // Called if user data changes but ID stays same
    el.textContent = user.name;
  }
});
```

---

**← Previous: [computed()](computed.md)** | **Next: [Guides](../../guides/forms.md) →**
