# stringAttr

Sets an HTML attribute to a reactive store value. Whenever the value changes, `el.setAttribute(name, value)` is called automatically. Use this when you need to drive `href`, `src`, `alt`, or any other attribute from state.

## Attribute

`data-{name}="key"` → sets `el.setAttribute(name, value)`

## Import

```js
import { stringAttr } from 'lume-js/handlers';
```

## Usage

`stringAttr` is a factory. Call it with the attribute name you want to drive, then pass the result to `bindDom`:

```js
import { state, bindDom } from 'lume-js';
import { stringAttr } from 'lume-js/handlers';

const store = state({
  profileUrl: '/user/ada',
  avatarSrc: '/avatars/ada.png',
  altText: 'Ada Lovelace'
});

bindDom(document.body, store, {
  handlers: [
    stringAttr('href'),
    stringAttr('src'),
    stringAttr('alt')
  ]
});
```

```html
<a data-href="profileUrl">Profile</a>
<img data-src="avatarSrc" data-alt="altText">
```

As `store.profileUrl` changes, `el.setAttribute('href', newValue)` is called automatically.

## Null / undefined handling

When the value is `null` or `undefined`, the attribute is **removed** (`el.removeAttribute(name)`):

```js
store.profileUrl = null; // <a> loses its href attribute entirely
```

## Common use cases

```js
bindDom(root, store, {
  handlers: [
    stringAttr('href'),    // <a data-href="url">
    stringAttr('src'),     // <img data-src="src">, <script data-src="...">
    stringAttr('alt'),     // <img data-alt="desc">
    stringAttr('title'),   // tooltip text
    stringAttr('type'),    // <button data-type="submit|button|reset">
    stringAttr('target'),  // <a data-target="_blank">
    stringAttr('value'),   // <option data-value="...">
  ]
});
```

## Compared to `data-bind`

`data-bind` sets DOM **properties** (like `el.href`, `el.textContent`). `stringAttr` sets HTML **attributes** (like `el.setAttribute('href', ...)`). For most `href` and `src` use cases they behave the same, but attributes are sometimes needed for custom elements or ARIA.

## See also

- [Handlers guide](../../guides/handlers.md)
- [bindDom()](../core/bindDom.md)
- [show](show.md), [classToggle](classToggle.md)

---

**← Previous: [classToggle](classToggle.md)** | **Next: [createDebugPlugin](../addons/debug.md) →**
