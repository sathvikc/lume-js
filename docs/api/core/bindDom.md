# bindDom(root, store, options?)

Binds a reactive state to DOM elements using `data-*` attributes.

## Signature

```typescript
function bindDom(
  root: HTMLElement, 
  store: ReactiveState<any>, 
  options?: BindDomOptions
): () => void;

interface BindDomOptions {
  immediate?: boolean;
  handlers?: (Handler | Handler[])[];
}

interface Handler {
  readonly attr: string;
  apply(el: HTMLElement, val: any): void;
}
```

## Parameters

- `root` (HTMLElement): The root element to scan for bindings.
- `store` (Object): The reactive state object created by `state()`.
- `options` (Object, optional):
    - `immediate` (Boolean): If `true`, binds immediately without waiting for `DOMContentLoaded`. Default is `false`.
    - `handlers` (Array): Additional handlers for reactive `data-*` attributes. See [Handlers](handlers.md).

## Returns

- A cleanup function that removes all bindings and event listeners.

## Description

Scans the `root` element for elements with reactive `data-*` attributes. It sets up:
1.  **Two-way binding** (`data-bind`): Updates DOM when state changes, updates state when form inputs change.
2.  **Boolean attributes** (`data-hidden`, `data-disabled`, `data-checked`, `data-required`): Toggles DOM properties.
3.  **ARIA attributes** (`data-aria-expanded`, `data-aria-hidden`): Sets "true"/"false" string values.
4.  **Custom handlers**: Any additional handlers passed via `options.handlers`.

## Built-in Attributes

| Attribute | Effect | Example |
| :--- | :--- | :--- |
| `data-bind="key"` | Two-way binding for inputs, `textContent` for others | `<input data-bind="name">` |
| `data-hidden="key"` | `el.hidden = Boolean(val)` | `<div data-hidden="isLoading">` |
| `data-disabled="key"` | `el.disabled = Boolean(val)` | `<button data-disabled="isSubmitting">` |
| `data-checked="key"` | `el.checked = Boolean(val)` | `<input data-checked="isAgreed" type="checkbox">` |
| `data-required="key"` | `el.required = Boolean(val)` | `<input data-required="fieldRequired">` |
| `data-aria-expanded="key"` | `el.setAttribute('aria-expanded', 'true'/'false')` | `<button data-aria-expanded="menuOpen">` |
| `data-aria-hidden="key"` | `el.setAttribute('aria-hidden', 'true'/'false')` | `<div data-aria-hidden="isCollapsed">` |

## Supported Elements for `data-bind`

| Element | Attribute Updated | Event Listened |
| :--- | :--- | :--- |
| `input[type="text"]` | `value` | `input` |
| `input[type="checkbox"]` | `checked` | `input` |
| `input[type="radio"]` | `checked` | `input` |
| `input[type="number/range"]` | `valueAsNumber` | `input` |
| `select` | `value` | `input` |
| `textarea` | `value` | `input` |
| Other (div, span, etc.) | `textContent` | — |

## Examples

### Basic

```html
<div id="app">
  <h1 data-bind="title"></h1>
  <input data-bind="title">
</div>

<script type="module">
  import { state, bindDom } from 'lume-js';

  const store = state({ title: 'Hello' });
  const cleanup = bindDom(document.getElementById('app'), store);
</script>
```

### With Built-in Attributes

```html
<form id="signup">
  <input data-bind="email" data-required="emailRequired">
  <button data-disabled="isSubmitting">Submit</button>
  <div data-hidden="isSuccess">Thanks!</div>
</form>

<script type="module">
  import { state, bindDom } from 'lume-js';

  const store = state({
    email: '',
    emailRequired: true,
    isSubmitting: false,
    isSuccess: false
  });

  bindDom(document.getElementById('signup'), store);
</script>
```

### With Handlers

```javascript
import { state, bindDom } from 'lume-js';
import { show, classToggle, stringAttr } from 'lume-js/handlers';

const store = state({
  isVisible: true,
  isActive: false,
  profileUrl: '/user/alice'
});

bindDom(document.body, store, {
  handlers: [show, classToggle('active'), stringAttr('href')]
});
```

```html
<span data-show="isVisible">Content</span>
<div data-class-active="isActive">Item</div>
<a data-href="profileUrl">Profile</a>
```

### Nested State Paths

```javascript
const store = state({
  user: state({ name: 'Alice', isAdmin: false })
});

bindDom(document.body, store);
```

```html
<span data-bind="user.name"></span>
<div data-hidden="user.isAdmin">Admin Panel</div>
```

## Performance

`bindDom` uses several internal optimizations:

- **Event delegation**: Single `input` event listener on root (not per-input)
- **Compiled selectors**: All handler attrs combined into one `querySelectorAll` call
- **O(1) binding lookup**: WeakMap for element → binding resolution
- **Auto DOM-ready**: Waits for `DOMContentLoaded` unless `{ immediate: true }`

## Handler System

User handlers extend the built-in set. They're merged via Map deduplication — if a user handler has the same `attr` as a built-in, it overrides the default.

Arrays are auto-flattened one level, so factories like `classToggle()` that return arrays work directly:

```javascript
// classToggle('a', 'b') returns [{ attr: 'data-class-a', ... }, { attr: 'data-class-b', ... }]
// Auto-flattened by bindDom
bindDom(root, store, { handlers: [classToggle('a', 'b')] });
```

See the full [Handlers API reference](handlers.md) for available handlers and how to create custom ones.

---

**← Previous: [state()](state.md)** | **Next: [effect()](effect.md) →**

> **Deep Dive:** Why `data-*` attributes instead of custom directives? Read the [Design Decision](../../design/design-decisions.md#why-standards-only).
