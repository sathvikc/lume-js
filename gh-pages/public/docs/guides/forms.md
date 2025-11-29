# Forms

Lume.js makes form handling simple with two-way binding.

## Basic Inputs

```html
<input data-bind="name">
<textarea data-bind="bio"></textarea>
<select data-bind="role">
  <option value="user">User</option>
  <option value="admin">Admin</option>
</select>
```

```javascript
const store = state({
  name: '',
  bio: '',
  role: 'user'
});

bindDom(document.body, store);
```

## Checkboxes & Radios

```html
<!-- Single Checkbox (Boolean) -->
<input type="checkbox" data-bind="acceptedTerms">

<!-- Radio Buttons (String) -->
<input type="radio" name="theme" value="light" data-bind="theme">
<input type="radio" name="theme" value="dark" data-bind="theme">
```

## Validation

You can use `effect()` or `$subscribe()` to validate inputs.

```javascript
const store = state({
  email: '',
  error: ''
});

store.$subscribe('email', (email) => {
  if (!email.includes('@')) {
    store.error = 'Invalid email';
  } else {
    store.error = '';
  }
});
```

## Submitting

Use standard `submit` events.

```javascript
document.querySelector('form').addEventListener('submit', (e) => {
  e.preventDefault();
  console.log('Submitting:', store.name, store.email);
});
```

---

**← Previous: [API: repeat()](../api/addons/repeat.md)** | **Next: [Routing](routing.md) →**
