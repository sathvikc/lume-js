# htmlAttrs()

One-import preset that enables reactive handlers for all standard HTML and ARIA attributes.

## Signature

```ts
function htmlAttrs(): Array<{ attr: string; apply(el: HTMLElement, val: any): void }>
```

## Import

```js
import { htmlAttrs } from 'lume-js/handlers';
```

## Returns

A flat array of handler objects — pass directly to `bindDom`'s `handlers` option.

## Usage

```js
import { state, bindDom } from 'lume-js';
import { htmlAttrs } from 'lume-js/handlers';

const store = state({
  profileUrl: '/user/alice',
  avatarSrc: '/img/alice.jpg',
  panelOpen: false,
  isPressed: false,
  liveRegion: 'polite',
});

bindDom(document.body, store, { handlers: htmlAttrs() });
```

```html
<a data-href="profileUrl">Profile</a>
<img data-src="avatarSrc" data-alt="username">
<details data-open="panelOpen">
  <summary>Details</summary>
</details>
<button data-aria-pressed="isPressed">Toggle</button>
<div role="status" data-aria-live="liveRegion">Updates here</div>
```

## What's Included

`htmlAttrs()` includes handlers for three categories:

**Boolean HTML attributes** — toggled present/absent via `toggleAttribute`:
`readonly`, `open`, `novalidate`, `formnovalidate`, `multiple`, `autofocus`, `autoplay`, `controls`, `loop`, `muted`, `defer`, `async`, `reversed`, `selected`, `inert`, `allowfullscreen`

**String HTML attributes** — set as strings, removed when `null`/`undefined`:
`href`, `src`, `alt`, `title`, `placeholder`, `action`, `method`, `target`, `rel`, `type`, `name`, `role`, `lang`, `tabindex`, `pattern`, `min`, `max`, `step`, `minlength`, `maxlength`, `width`, `height`, `for`, `form`, `accept`, `autocomplete`, `loading`, `decoding`, `inputmode`, `enterkeyhint`, `draggable`, `contenteditable`, `spellcheck`, `translate`, `dir`, `id`, `poster`, `preload`, `download`, `media`, `sizes`, `srcset`, `colspan`, `rowspan`, `scope`, `headers`, `wrap`, `sandbox`, and more.

**ARIA attributes** — both boolean states (`aria-pressed`, `aria-selected`, `aria-disabled`, …) and string/token attributes (`aria-live`, `aria-label`, `aria-sort`, …).

Also includes the `show` handler (`data-show`).

## When to use

`htmlAttrs()` is the simplest choice when you want broad coverage without importing individual handlers. It covers nearly every standard HTML and ARIA attribute reactively.

For precise control over bundle size, import only the handlers you actually use:

```js
import { boolAttr, stringAttr, ariaAttr } from 'lume-js/handlers';

bindDom(root, store, {
  handlers: [boolAttr('open'), stringAttr('href'), ariaAttr('expanded')]
});
```

## See also

- [boolAttr](boolAttr.md)
- [ariaAttr](ariaAttr.md)
- [stringAttr](stringAttr.md)
- [show](show.md)
- [Handlers guide](../../guides/handlers.md)
- [bindDom()](../core/bindDom.md)

---

**← Previous: [ariaAttr](ariaAttr.md)** | **Next: [show](show.md) →**
