# Forms

Lume handles form state through the same `data-bind` attribute used everywhere else. There is no special form API — bindings are two-way on form controls by default.

## Basic inputs

Add `data-bind` to any form control and `bindDom` wires it up automatically.

```html
<input data-bind="name">
<textarea data-bind="bio"></textarea>
<select data-bind="role">
  <option value="user">User</option>
  <option value="admin">Admin</option>
</select>
```

```js
const store = state({
  name: '',
  bio: '',
  role: 'user'
});

bindDom(document.body, store);
```

## Checkboxes and radios

Checkboxes bind to a boolean. Radio groups bind to a string value — whichever radio's `value` attribute matches the store value gets checked.

```html
<!-- Single checkbox — store.acceptedTerms === true | false -->
<input type="checkbox" data-bind="acceptedTerms">

<!-- Radio group — store.theme === 'light' | 'dark' -->
<input type="radio" name="theme" value="light" data-bind="theme">
<input type="radio" name="theme" value="dark" data-bind="theme">
```

## Validation

Use `watch` to run validation logic whenever a specific field changes. Write the result back to an error key in the store.

```js
import { watch } from 'lume-js/addons';

const store = state({
  email: '',
  error: ''
});

watch(store, 'email', (email) => {
  store.error = email.includes('@') ? '' : 'Invalid email';
});
```

```html
<input data-bind="email" type="email">
<span data-bind="error"></span>
```

## Submitting

Use a standard `submit` event. The store already holds the current values — read them directly.

```js
document.querySelector('form').addEventListener('submit', (e) => {
  e.preventDefault();
  console.log('Submitting:', store.name, store.email);
});
```

## Reactive form attributes

The built-in `data-hidden` and `data-disabled` attributes let you control form state reactively without extra imports:

```html
<button data-disabled="isSubmitting">Submit</button>
<div data-hidden="isSubmitting">Form content</div>
```

For `readonly` and other form attributes not covered by the built-ins, import `formHandlers`:

```js
import { formHandlers } from 'lume-js/handlers';

bindDom(root, store, { handlers: formHandlers });
```

```html
<input data-bind="name" data-readonly="isLocked">
```

---

**← Previous: [Lists & repeat](lists.md)** | **Next: [Animations](animations.md) →**
