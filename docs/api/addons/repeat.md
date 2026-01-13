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
    update?: (item: any, el: HTMLElement, index: number, context: { isFirstRender: boolean }) => void;
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
    - `render` (Function, optional): Called for all items (both new and existing). Use for simple cases.
    - `create` (Function, optional): Called once when a new element is created (for DOM structure).
    - `update` (Function, optional): `(item, el, index, { isFirstRender }) => void`. Called for data binding. Skipped if same object reference AND same index.
    - `element` (String or Function, optional): The HTML tag or factory (default: `div`).

## Returns

- A cleanup function.

## Description

`repeat` synchronizes a DOM list with an array in your state. It uses the `key` function to track item identity, ensuring that DOM elements are reused, reordered, or removed efficiently rather than re-rendered from scratch.

**Important:** You must use **immutable updates** for the array (e.g., `store.items = [...newItems]`) for `repeat` to detect changes.

## Pattern 1: Simple (render only)

Best for simple items where you don't need DOM/data separation.

```javascript
import { state } from 'lume-js';
import { repeat } from 'lume-js/addons';

const store = state({ users: [{ id: 1, name: 'Alice' }] });

repeat('#user-list', store, 'users', {
  key: user => user.id,
  render: (user, el) => {
    el.textContent = user.name;  // Called on every update
  }
});
```

## Pattern 2: Clean API (create + update) — Recommended

Best for complex items with event listeners and DOM structure.

```javascript
repeat('#user-list', store, 'users', {
  key: user => user.id,
  create: (user, el) => {
    // Called ONCE - create DOM structure and attach listeners
    el.innerHTML = '<span class="name"></span><button>Delete</button>';
    el.querySelector('button').onclick = () => deleteUser(user.id);
  },
  update: (user, el, index, { isFirstRender }) => {
    // Called on each render - bind data
    // isFirstRender = true on initial, false on subsequent
    el.querySelector('.name').textContent = user.name;
    
    if (!isFirstRender) {
      el.classList.add('updated');  // Animate only on updates
    }
  }
});
```

## Performance

- **Reference optimization**: `update` is skipped if the item object reference hasn't changed
- **Keyed diffing**: Elements are reused by key, not recreated
- **Minimal DOM operations**: Only changed elements are touched

---

**← Previous: [computed()](computed.md)** | **Next: [Guides](../../guides/forms.md) →**

