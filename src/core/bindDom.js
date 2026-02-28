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
 */

import { resolvePath } from "./utils.js";

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

    // Event delegation for two-way bindings
    const inputHandler = e => {
      const binding = bindingMap.get(e.target);
      if (binding) binding.target[binding.key] = getInputValue(e.target);
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
 * Apply a handler to an element via subscription.
 * Resolves the state path and subscribes to changes.
 */
function applyHandler(el, store, path, handler) {
  const result = resolveProp(store, path);
  if (!result) return null;
  const { target, key } = result;
  return target.$subscribe(key, val => handler.apply(el, val));
}

/**
 * Handle data-bind (two-way for inputs, textContent for others)
 */
function handleDataBind(el, store, path, bindingMap) {
  const result = resolveProp(store, path);
  if (!result) return null;

  const { target, key } = result;
  const unsub = target.$subscribe(key, val => updateElement(el, val));

  if (isFormInput(el)) {
    bindingMap.set(el, { target, key });
  }

  return unsub;
}

/**
 * Resolve path to target and key
 */
function resolveProp(store, path) {
  if (!path) return null;

  const pathArr = path.split(".");
  const key = pathArr.pop();
  let target;

  try {
    target = resolvePath(store, pathArr);
  } catch {
    console.warn(`[Lume.js] Invalid path "${path}"`);
    return null;
  }

  if (!target?.$subscribe) {
    console.warn(`[Lume.js] Target for "${path}" is not reactive`);
    return null;
  }

  return { target, key };
}

/**
 * Update element with value (for data-bind)
 */
function updateElement(el, val) {
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