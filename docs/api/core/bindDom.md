# bindDom(root, store, options?)

Binds a reactive state to DOM elements using `data-bind` attributes.

## Signature

```typescript
function bindDom(
  root: HTMLElement, 
  store: object, 
  options?: { immediate?: boolean }
): () => void;
```

## Parameters

- `root` (HTMLElement): The root element to scan for bindings.
- `store` (Object): The reactive state object.
- `options` (Object, optional):
    - `immediate` (Boolean): If `true`, binds immediately without waiting for `DOMContentLoaded`. Default is `false`.

## Returns

- A cleanup function that removes all event listeners.

## Description

Scans the `root` element for elements with `data-bind="key"`. It sets up:
1.  **One-way binding**: Updates the DOM when `store.key` changes.
2.  **Two-way binding**: Updates `store.key` when form inputs change.

## Supported Elements

| Element | Attribute Updated | Event Listened |
| :--- | :--- | :--- |
| `input[type="text"]` | `value` | `input` |
| `input[type="checkbox"]` | `checked` | `change` |
| `input[type="radio"]` | `checked` | `change` |
| `select` | `value` | `change` |
| `textarea` | `value` | `input` |
| Other (div, span, etc.) | `textContent` | - |

## Example

```html
<div id="app">
  <h1 data-bind="title"></h1>
  <input data-bind="title">
</div>

<script>
  const store = state({ title: 'Hello' });
  const cleanup = bindDom(document.getElementById('app'), store);
</script>
```

## Performance

`bindDom` uses **event delegation** internally for optimal performance:

- Single `input` event listener on the root element (not per-input)
- O(1) lookup via internal Map for binding resolution
- Memory efficient: 100 inputs = 1 listener (not 100 listeners)

This is an internal optimization — no API changes required.

---

**← Previous: [state()](state.md)** | **Next: [effect()](effect.md) →**

> **Deep Dive:** Why `bindDom` instead of `v-model`? Read the [Design Decision](../../design/design-decisions.md#why-standards-only).
