# 04 — fix(core): the reactive brand symbol was dead code — make it a real brand

| | |
|---|---|
| **Type** | Bug fix (dead code → working feature) |
| **Files changed** | `src/core/state.js`, `src/addons/index.js` |
| **Tests** | `tests/core/state.test.js` (brand sharing), `tests/addons/index.test.js` (`describe('isReactive')`) |
| **Breaking?** | No |

## The bug

`state()` stamped every store with a "brand symbol for type-level reactive
identification":

```js
// BEFORE — inside state(), i.e. re-created on EVERY call
const REACTIVE_BRAND = Symbol('lume.reactive');
obj[REACTIVE_BRAND] = true;
```

`Symbol('lume.reactive')` creates a **unique** symbol each time. Created
inside `state()`, every store got a *different* brand that no other code —
not even lume itself — could ever look up. It was unreachable dead weight on
every store, and `isReactive()` had to rely on duck-typing alone:

```js
// BEFORE — addons/index.js
return !!(obj && typeof obj === 'object' && typeof obj.$subscribe === 'function');
```

Duck-typing means **any** object with a `$subscribe` property passed the
check — including a `{ ...store }` spread copy, which drags the (enumerable)
`$subscribe` function along but is *not* reactive.

## The fix

### 1. One shared brand, via the global symbol registry

```js
// AFTER — module level, src/core/state.js
export const REACTIVE_BRAND = Symbol.for('lume.reactive');
```

`Symbol.for` registers the symbol globally, so two independent copies of
lume-js on the same page (a CDN `<script type="module">` next to a bundled
chunk — a real scenario for a no-build library) agree on the same brand.

### 2. Stamped non-enumerably

```js
Object.defineProperty(obj, REACTIVE_BRAND, { value: true });
```

Non-enumerable means `{ ...store }` and `Object.assign({}, store)` copies do
**not** inherit the brand — a snapshot of a store no longer brands itself as
reactive.

### 3. `isReactive()` checks the brand first

```js
return !!(obj && typeof obj === 'object' &&
  (REACTIVE_BRAND in obj || typeof obj.$subscribe === 'function'));
```

Two details worth knowing:

- **`in`, not a property read.** The `in` operator goes through the proxy's
  `has` trap (which lume doesn't define → plain lookup), *not* the `get`
  trap. So calling `isReactive(store)` inside an `effect()` does **not**
  register a phantom dependency. There's a test asserting this.
- **Duck-typing kept as fallback.** Stores from older lume-js versions carry
  the old per-instance symbols, so `$subscribe` detection remains for
  compatibility. It is checked *second*.

## Not a security boundary

Anyone can stamp `Symbol.for('lume.reactive')` onto any object. The brand is
a *type tag* for reliable detection, exactly like `Symbol.iterator` — not
proof of origin. (This was equally true of duck-typing.)

## Example

```js
import { state } from 'lume-js';
import { isReactive } from 'lume-js/addons';

const store = state({ count: 0 });

isReactive(store);        // true  (brand)
isReactive({});           // false
isReactive({ ...store }); // true — but ONLY via the $subscribe fallback;
                          // the brand itself no longer leaks into copies
```

## How to verify

```bash
npx vitest run tests/addons/index.test.js -t 'isReactive'
npx vitest run tests/core/state.test.js -t 'brand'
```
