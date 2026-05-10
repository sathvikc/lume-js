# className

Replaces an element's full class string with a store value.

## Attribute

`data-classname="key"`

## Import

```js
import { className } from 'lume-js/handlers';
```

## Usage

```js
import { state, bindDom } from 'lume-js';
import { className } from 'lume-js/handlers';

const store = state({ cardStyle: 'card card--featured' });

bindDom(document.body, store, { handlers: [className] });
```

```html
<div data-classname="cardStyle">Featured</div>
```

When `store.cardStyle` changes, `el.className` is replaced with the new value. If the value is falsy (`null`, `undefined`, `false`, `''`), the class string is set to `''`.

## Behavior

| Value | Effect |
|-------|--------|
| `'card card--featured'` | `el.className = 'card card--featured'` |
| `''` / falsy | `el.className = ''` (all classes removed) |

`className` replaces the entire class string on every update. Any classes added outside reactive state will be lost.

## Compared to `classToggle`

| | `className` | `classToggle` |
|--|-------------|---------------|
| Controls | Full class string | Individual CSS classes |
| Use when | Class string comes from state | Toggling one class on/off |
| Static classes safe | ❌ (overwritten) | ✅ (other classes preserved) |

Use `className` when the entire class string is computed. Use `classToggle` to flip individual classes based on boolean state while preserving others.

## See also

- [classToggle](classToggle.md)
- [show](show.md)
- [Handlers guide](../../guides/handlers.md)
- [bindDom()](../core/bindDom.md)

---

**← Previous: [show](show.md)** | **Next: [classToggle](classToggle.md) →**
