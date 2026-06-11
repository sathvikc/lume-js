/**
 * Create handlers for declarative event wiring.
 * Each type creates a handler: data-on{type}="key" wires the function held
 * at that store key as a DOM event listener.
 *
 *   <button data-onclick="addTodo">Add</button>
 *
 *   const store = state({
 *     addTodo: (event) => { ... }   // a plain function in state
 *   });
 *   bindDom(root, store, { handlers: [on('click')] });
 *
 * Reactive like any binding: assigning a new function to the key re-wires
 * the listener; assigning null/undefined detaches it.
 *
 * Returns an array — pass directly to handlers (auto-flattened by bindDom).
 *
 * @security Same trust model as data-bind: an injected data-on* attribute
 * can only reference functions that already exist in reachable state — no
 * expressions, no eval. Ensure your HTML is trusted or sanitized.
 *
 * Note: bindDom's cleanup stops future re-wiring but does not detach
 * listeners already attached to elements that remain in the DOM. Discard
 * the bound subtree (the normal SPA teardown) to drop them.
 *
 * @param {...string} types - DOM event types ('click', 'input', 'submit', ...)
 * @returns {Array<{ attr: string, apply: function }>}
 */

import { logWarn } from '../utils/log.js';

// element → Map<eventType, listener> — tracks what we attached so a
// re-assigned store key swaps the listener instead of stacking a second one.
const attached = new WeakMap();

export function on(...types) {
  return types.map(type => ({
    attr: `data-on${type}`,
    apply(el, val) {
      let byType = attached.get(el);
      const prev = byType ? byType.get(type) : undefined;

      if (prev) {
        el.removeEventListener(type, prev);
        byType.delete(type);
      }

      if (typeof val === 'function') {
        el.addEventListener(type, val);
        if (!byType) {
          byType = new Map();
          attached.set(el, byType);
        }
        byType.set(type, val);
      } else if (val != null) {
        logWarn(`[Lume.js] on('${type}'): bound value is not a function — listener detached`);
      }
    }
  }));
}
