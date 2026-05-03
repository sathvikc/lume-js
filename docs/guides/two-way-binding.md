# Two-way binding

A single `data-bind` attribute handles all form controls. Lume inspects the element type and wires the correct DOM property and event automatically — you don't need to configure anything.

## The rules

| Element | Property | Event |
|---------|----------|-------|
| `<input>` (text, email, password, search, tel, url) | `value` | `input` |
| `<input type="checkbox">` | `checked` | `input` |
| `<input type="radio">` | `checked` (by value) | `input` |
| `<input type="number">` | `valueAsNumber` | `input` |
| `<input type="range">` | `valueAsNumber` | `input` |
| `<input type="date">` | `value` | `input` |
| `<textarea>` | `value` | `input` |
| `<select>` | `value` | `input` |
| Anything else | `textContent` | (one-way) |

## Text inputs

```html
<input data-bind="username" placeholder="Username">
<input data-bind="email" type="email">
<textarea data-bind="bio"></textarea>
```

## Checkboxes

```html
<input type="checkbox" data-bind="agreed">
<!-- store.agreed === true | false -->
```

## Radio groups

```html
<input type="radio" name="size" data-bind="size" value="sm"> Small
<input type="radio" name="size" data-bind="size" value="md"> Medium
<input type="radio" name="size" data-bind="size" value="lg"> Large
<!-- store.size === 'md' -->
```

## Selects

```html
<select data-bind="country">
  <option value="us">United States</option>
  <option value="gb">United Kingdom</option>
  <option value="jp">Japan</option>
</select>
```

## Number inputs

Lume binds number inputs to `valueAsNumber`, so store values stay numbers — no manual parsing needed:

```html
<input type="number" data-bind="age">
<!-- store.age === 42  (a number, not the string '42') -->
```

## One-way bindings

Any element that is not a form control gets `textContent` set from the store. No event is attached — the element never writes back.

```html
<h1 data-bind="title"></h1>
<p>Count: <span data-bind="count"></span></p>
```

To set an HTML attribute (like `href` or `src`) reactively, use the [`stringAttr`](../api/handlers/stringAttr.md) handler instead.

---

**← Previous: [Handlers](handlers.md)** | **Next: [Lists & repeat](lists.md) →**
