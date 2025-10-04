# lume-js

Minimal reactive state + DOM binding with **zero runtime** overhead.  
Inspired by Go-style simplicity.

## Philosophy
- ⚡ Zero runtime, direct DOM updates (no VDOM, no diffing).
- 🔑 Simple `state()` and `bindDom()` — that's it.
- 🧩 Explicit nesting (`state({ user: state({ name: "Alice" }) })`).
- ✨ Works anywhere — plain JS, or alongside other frameworks.

## Install

```bash
npm install lume-js
```

## Example

**main.js**
```js
import { state, bindDom } from "lume-js";

const store = state({
  count: 0,
  user: state({ name: "Alice" })
});

bindDom(document.body, store);

document.getElementById("inc").addEventListener("click", () => {
  store.count++;
});

document.getElementById("changeName").addEventListener("click", () => {
  store.user.name = store.user.name === "Alice" ? "Bob" : "Alice";
});
```

**index.html**
```html
<p>Count: <span data-bind="count"></span></p>
<p>User Name: <span data-bind="user.name"></span></p>

<button id="inc">Increment</button>
<button id="changeName">Change Name</button>
```

## Status

🚧 Early alpha (`0.1.0`). API may change. Feedback welcome!
