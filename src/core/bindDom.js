// src/core/bindDom.js
/**
 * Lume-JS DOM Binding
 *
 * Binds reactive state to DOM elements using data-* attributes.
 *
 * Built-in attributes (always available):
 *   data-bind="key"           → Two-way binding for inputs, textContent for others
 *   data-hidden="key"         → Toggles hidden (truthy = hidden)
 *   data-disabled="key"       → Toggles disabled (truthy = disabled)
 *   data-checked="key"        → Toggles checked (for checkboxes/radios)
 *   data-required="key"       → Toggles required (truthy = required)
 *   data-aria-expanded="key"  → Sets aria-expanded to "true"/"false"
 *   data-aria-hidden="key"    → Sets aria-hidden to "true"/"false"
 *   data-bind-scope           → Boundary: an outer bindDom() skips everything
 *                               inside it (the element's own attributes still bind)
 *
 * Extensible via handlers option:
 *   import { show, classToggle } from 'lume-js/handlers';
 *   bindDom(root, store, { handlers: [show, classToggle('active')] });
 *
 * Custom handlers:
 *   const tooltip = { attr: 'data-tooltip', apply(el, val) { el.title = val ?? ''; } };
 *   bindDom(root, store, { handlers: [tooltip] });
 *
 * Usage:
 *   import { bindDom } from "lume-js";
 *   const cleanup = bindDom(document.body, store);
 *
 * @security `data-bind` attribute values are trusted as state paths (never
 * evaluated as expressions). If an attacker can inject `data-bind`
 * attributes into the DOM, they can subscribe to any reachable reactive state.
 * Ensure your HTML is trusted or sanitize it before calling bindDom().
 */

import { logWarn } from '../utils/log.js';

// --- Default Handlers (always active, backwards compatible) ---

const boolHandler = (name) => ({
  attr: `data-${name}`,
  apply(el, val) { el[name] = Boolean(val); }
});

const ariaHandler = (name) => ({
  attr: `data-${name}`,
  apply(el, val) { el.setAttribute(name, val ? 'true' : 'false'); }
});

const DEFAULT_HANDLERS = [
  boolHandler('hidden'),
  boolHandler('disabled'),
  boolHandler('checked'),
  boolHandler('required'),
  ariaHandler('aria-expanded'),
  ariaHandler('aria-hidden'),
];

/**
 * Merge default and user handlers.
 * User handlers override defaults with same attr (Map deduplicates).
 * User handler arrays are flattened one level (supports classToggle()).
 */
function mergeHandlers(defaults, userHandlers) {
  if (!userHandlers.length) return defaults;
  const merged = new Map();
  for (const h of defaults) merged.set(h.attr, h);
  for (const h of userHandlers.flat()) merged.set(h.attr, h);
  return [...merged.values()];
}

/**
 * DOM binding for reactive state
 */
export function bindDom(root, store, options = {}) {
  if (!(root instanceof HTMLElement)) {
    throw new Error('bindDom() requires a valid HTMLElement as root');
  }
  if (!store || typeof store !== 'object') {
    throw new Error('bindDom() requires a reactive state object');
  }

  const { immediate = false, handlers: userHandlers = [] } = options;
  const handlers = mergeHandlers(DEFAULT_HANDLERS, userHandlers);

  const performBinding = () => {
    const cleanups = [];
    const bindingMap = new WeakMap();

    // Build compiled selector: data-bind (always) + all handler attrs
    const selector = ['[data-bind]', ...handlers.map(h => `[${h.attr}]`)].join(',');
    const elements = root.querySelectorAll(selector);

    for (const el of elements) {
      if (!inNestedScope(el, root)) bindElement(el, store, handlers, bindingMap, cleanups);
    }

    // Event delegation for two-way bindings
    const inputHandler = e => {
      const binding = bindingMap.get(e.target);
      if (binding?.target) binding.target[binding.key] = getInputValue(e.target);
    };
    root.addEventListener("input", inputHandler);
    cleanups.push(() => root.removeEventListener("input", inputHandler));

    return () => cleanups.forEach(c => c());
  };

  // Auto-wait for DOM if needed
  if (!immediate && document.readyState === 'loading') {
    let cleanup = null;
    const onReady = () => { cleanup = performBinding(); };
    document.addEventListener('DOMContentLoaded', onReady, { once: true });
    return () => cleanup ? cleanup() : document.removeEventListener('DOMContentLoaded', onReady);
  }

  return performBinding();
}

/**
 * Bind one element's data-bind and handler attributes, collecting cleanups.
 */
function bindElement(el, store, handlers, bindingMap, cleanups) {
  // data-bind (two-way) — always in core, special handling
  if (el.hasAttribute('data-bind')) {
    const c = handleDataBind(el, store, el.getAttribute('data-bind'), bindingMap);
    if (c) cleanups.push(c);
  }

  // All registered handlers (default + user)
  for (const handler of handlers) {
    if (el.hasAttribute(handler.attr)) {
      const c = applyHandler(el, store, el.getAttribute(handler.attr), handler);
      if (c) cleanups.push(c);
    }
  }
}

/**
 * True when el sits inside a data-bind-scope below root: that region
 * belongs to another bindDom(). The scope element itself is not inside.
 */
function inNestedScope(el, root) {
  const scope = el.parentElement.closest('[data-bind-scope]');
  return scope !== null && scope !== root && root.contains(scope);
}

/**
 * Apply a handler to an element via subscription.
 */
function applyHandler(el, store, path, handler) {
  return watchPath(store, path, val => handler.apply(el, val));
}

/**
 * Handle data-bind (two-way for inputs, textContent for others).
 * For inputs, the delegated input listener writes to whichever object the
 * path currently ends on, so typing follows a replaced intermediate state.
 */
function handleDataBind(el, store, path, bindingMap) {
  const input = isFormInput(el);
  return watchPath(store, path, (val, target, key) => {
    if (input && bindingMap.get(el)?.target !== target) bindingMap.set(el, { target, key });
    applyBindValue(el, val);
  });
}

/**
 * Subscribe to a state path, calling onValue(val, target, key) with the leaf
 * value and the object that currently holds it. Returns an unsubscribe, or
 * null when there is nothing to bind.
 */
function watchPath(store, path, onValue) {
  return path ? link(store, path.split('.'), 0, path, onValue) : null;
}

/**
 * Bind keys[i..] starting from obj. Plain objects and arrays are stepped
 * through once, without subscribing (they cannot notify), so list.0.name
 * works with an array of states. The first reactive object takes over in
 * follow(). The leaf key must sit on a reactive object, else it warns.
 * Returns null when nothing was bound (follow() then renders undefined;
 * a null/undefined step is quiet, since that is how async data starts).
 */
function link(obj, keys, i, path, onValue) {
  while (obj != null && !obj.$subscribe) {
    if (typeof obj !== 'object' || i === keys.length - 1 || !(keys[i] in obj)) {
      logWarn(`[Lume.js] Path "${path}" is not reactive at "${keys[i]}"`);
      return null;
    }
    obj = obj[keys[i++]];
  }
  return obj == null ? null : follow(obj, keys, i, path, onValue);
}

/**
 * Subscribe to keys[i] on reactive obj. The leaf key calls onValue directly
 * (a flat path is exactly one $subscribe). An intermediate key re-links
 * everything below it whenever it changes, so replacing user (or assigning
 * it after null) moves the binding to the new object.
 */
function follow(obj, keys, i, path, onValue) {
  const key = keys[i];
  if (i === keys.length - 1) return obj.$subscribe(key, val => onValue(val, obj, key));
  let unlinkInner = null;
  const unsub = obj.$subscribe(key, next => {
    if (unlinkInner) unlinkInner();
    unlinkInner = !(key in obj)
      ? logWarn(`[Lume.js] Path "${path}" is not reactive at "${key}"`)
      : link(next, keys, i + 1, path, onValue);
    if (!unlinkInner) onValue(undefined, null, keys[keys.length - 1]);
  });
  return () => {
    unsub();
    if (unlinkInner) unlinkInner();
    unlinkInner = null;
  };
}

/**
 * Update element with value (for data-bind).
 *
 * Exported for internal reuse (e.g. the repeat addon's template bindings)
 * so addon and core data-bind semantics never drift. Not part of the
 * public package API.
 */
export function applyBindValue(el, val) {
  if (el.tagName === "INPUT") {
    if (el.type === "checkbox") el.checked = Boolean(val);
    else if (el.type === "radio") el.checked = el.value === String(val);
    else el.value = val ?? '';
  } else if (el.tagName === "TEXTAREA" || el.tagName === "SELECT") {
    el.value = val ?? '';
  } else {
    el.textContent = val ?? '';
  }
}

/**
 * Get value from input
 */
function getInputValue(el) {
  if (el.type === "checkbox") return el.checked;
  if (el.type === "number" || el.type === "range") return el.valueAsNumber;
  return el.value;
}

/**
 * Check if element is form input
 */
function isFormInput(el) {
  return el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT";
}