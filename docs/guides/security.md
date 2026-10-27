# Security model

Lume binds markup to state without ever evaluating markup. This page lists what that guarantees, what it does not, and where you still have to be careful.

## Attributes hold paths, never expressions

`data-bind="user.name"`, `data-hidden="isLoading"` and every handler attribute contain a **state path**: dot-separated keys looked up on the store. Lume never passes attribute text to `eval`, `new Function`, or an expression interpreter, and the library source contains none of them.

This matters when markup comes from somewhere you do not fully control (a CMS, server-rendered user content, a third-party widget). In libraries that evaluate expressions in attributes (`{{ }}`, `:attr="a + b"`, `x-on:click="..."`), injected markup can become injected code. In Lume, an injected `data-*` attribute can only point at state that already exists:

- it can **read** any key reachable from the store passed to `bindDom()` (and display it in the element it sits on);
- a two-way `data-bind` on an injected `<input>` can **write** a string or number to such a key;
- `data-onclick` (from the opt-in `on()` handler) can attach a function that is **already in state** as a listener. It cannot create one.

So treat HTML you pass to `bindDom()` as trusted, or keep sensitive values and functions out of the store that untrusted markup is bound to. `data-bind-scope` lets you give an embedded region its own, smaller store.

## Text is set as text

`data-bind` writes `textContent` (or `.value` / `.checked` on form controls), and so do `repeat()` template bindings. Lume has no binding that writes `innerHTML`, so a store value containing `<img src=x onerror=...>` is displayed as literal text.

The one place HTML can enter is code you write yourself: `render`, `create`, `update`, effects. If you build markup there, never interpolate data into it:

```js
// ❌ item.text becomes markup
el.innerHTML = `<span>${item.text}</span>`;

// ✅ static structure, data as text
el.innerHTML = '<span></span>';
el.querySelector('span').textContent = item.text;
```

## URL attributes are scheme-filtered

`stringAttr()` (and the `htmlAttrs()` preset) remove the attribute instead of setting it when a URL attribute (`href`, `src`, `action`, `srcset`, `poster`, `formaction`, `data`) would get a `javascript:`, `vbscript:` or `data:text/html` value. The check first strips the characters the browser's URL parser ignores, so `"\tjava\nscript:..."` and `" JaVaScRiPt:..."` are caught, while relative URLs like `javascript-tutorial.html` are not blocked. Other `data:` URLs (images, `data:image/svg+xml`) are allowed: browsers load them in an opaque origin, isolated from your page, so treat a user-supplied `data:` URL in `<object data>` like any untrusted embed rather than relying on this filter.

`data-bind` sets properties, not URL attributes, so it never produces a navigable `href`. Other attributes set through `stringAttr()` (`title`, `alt`, ...) are plain strings and are never parsed as URLs or HTML.

## State cannot be used to pollute prototypes

Writes to `__proto__`, `constructor` and `prototype` on a store are dropped with a console warning, so `Object.assign(store, JSON.parse(untrusted))` cannot swap a store's prototype or reach `Object.prototype`. Creating a store from parsed JSON is safe too: `JSON.parse` turns a `"__proto__"` key into a plain own property, and `state()` keeps it that way.

## Runaway code is bounded

- **Subscribers:** at most 1000 per key. Past that, `$subscribe` logs an error and returns a no-op, which turns a subscription leak (subscribing in a loop without cleanup) into a visible error instead of unbounded memory growth.
- **Update loops:** an effect or computed that keeps writing state it reads is stopped after 100 flush iterations with a logged error, instead of freezing the page.

## What Lume does not do

- It does not sanitize HTML. If you must render user-provided HTML, sanitize it with a dedicated library before writing it yourself.
- It does not protect values in state from code running on the same page. Anything in a store is readable by any script that can reach the store.
- `persist()` writes state to `localStorage`/`sessionStorage` (or the storage you pass) as plain JSON. Do not persist secrets or tokens. On load it only assigns the keys you listed, never unknown keys from storage.

## See also

- [stringAttr](../api/handlers/stringAttr.md) — URL filtering details
- [bindDom()](../api/core/bindDom.md) — paths and `data-bind-scope`
- [Why standards-only?](../design/design-decisions.md#why-standards-only)

---

<!-- lume:nav -->
**← Previous: [Lists & repeat](lists.md)** | **Next: [Forms](forms.md) →**
<!-- /lume:nav -->
