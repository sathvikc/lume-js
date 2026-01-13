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
    render?: (item: any, el: HTMLElement, index: number) => void;
    create?: (item: any, el: HTMLElement, index: number) => void;
    update?: (item: any, el: HTMLElement, index: number) => void;
    element?: string | (() => HTMLElement);
  }
): () => void;
```

## Parameters

- `container`: The DOM element (or selector string) to render into.
- `store`: The reactive state object.
- `key`: The property name of the array in the state.
- `options`:
    - `key` (Function): Returns a unique ID for each item. **Critical for performance.**
    - `render` (Function, optional): Called for all items (both new and existing). Use if you want simple behavior.
    - `create` (Function, optional): Called once when a new element is created (for DOM structure).
    - `update` (Function, optional): `(item, el, index, { isFirstRender }) => void`. Called for data binding. **Skipped if same object reference.** The `isFirstRender` flag indicates if this is the initial render for this element.
    - `element` (String or Function, optional): The HTML tag or factory (default: `div`).

## Returns

- A cleanup function.

## Description

`repeat` synchronizes a DOM list with an array in your state. It uses the `key` function to track item identity, ensuring that DOM elements are reused, reordered, or removed efficiently rather than re-rendered from scratch.

**Important:** You must use **immutable updates** for the array (e.g., `store.items = [...newItems]`) for `repeat` to detect changes.

## Example: Simple (render only)

```javascript
import { state } from 'lume-js';
import { repeat } from 'lume-js/addons';

const store = state({ users: [{ id: 1, name: 'Alice' }] });

repeat('#user-list', store, 'users', {
  key: user => user.id,
  render: (user, el) => {
    el.textContent = user.name;
  }
});
```

## Example: Clean API (create + update)

```javascript
repeat('#user-list', store, 'users', {
  key: user => user.id,
  create: (user, el) => {
    // Called ONCE - create DOM structure
    el.innerHTML = '<span class="name"></span><button>X</button>';
  },
  update: (user, el) => {
    // Called on each render - bind data
    el.querySelector('.name').textContent = user.name;
  }
});
```

## Performance

- **Reference optimization**: `update` is skipped if the item object reference hasn't changed
- **Keyed diffing**: Elements are reused by key, not recreated
- **Minimal DOM operations**: Only changed elements are touched

---

**← Previous: [computed()](computed.md)** | **Next: [Guides](../../guides/forms.md) →**

