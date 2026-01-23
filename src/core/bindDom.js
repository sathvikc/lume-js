// src/core/bindDom.js
/**
 * Lume-JS DOM Binding
 *
 * Binds reactive state to DOM elements using data-* attributes.
 * 
 * Supported attributes:
 *   data-bind="key"           → Two-way binding for inputs, textContent for others
 *   data-hidden="key"         → Toggles hidden (truthy = hidden)
 *   data-disabled="key"       → Toggles disabled (truthy = disabled)
 *   data-checked="key"        → Toggles checked (for checkboxes/radios)
 *   data-required="key"       → Toggles required (truthy = required)
 *   data-aria-expanded="key"  → Sets aria-expanded to "true"/"false"
 *   data-aria-hidden="key"    → Sets aria-hidden to "true"/"false"
 *
 * Usage:
 *   import { bindDom } from "lume-js";
 *   const cleanup = bindDom(document.body, store);
 */

import { resolvePath } from "./utils.js";

// HTML boolean properties (use el[prop] = true/false)
const BOOLEAN_ATTRS = ['hidden', 'disabled', 'checked', 'required'];

// ARIA boolean attributes (set "true"/"false" string)
const ARIA_ATTRS = ['aria-expanded', 'aria-hidden'];

// Build selector from supported attrs
const SELECTORS = [
  '[data-bind]',
  ...BOOLEAN_ATTRS.map(a => `[data-${a}]`),
  ...ARIA_ATTRS.map(a => `[data-${a}]`)
].join(', ');

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

  const { immediate = false } = options;

  const performBinding = () => {
    const cleanups = [];
    const bindingMap = new WeakMap();
    const elements = root.querySelectorAll(SELECTORS);

    for (const el of elements) {
      // data-bind (two-way)
      if (el.hasAttribute('data-bind')) {
        const c = handleDataBind(el, store, el.getAttribute('data-bind'), bindingMap);
        if (c) cleanups.push(c);
      }

      // Boolean attrs (hidden, disabled, checked, required)
      for (const attr of BOOLEAN_ATTRS) {
        const dataAttr = `data-${attr}`;
        if (el.hasAttribute(dataAttr)) {
          const c = handleBooleanProp(el, store, el.getAttribute(dataAttr), attr);
          if (c) cleanups.push(c);
        }
      }

      // ARIA attrs (aria-expanded, aria-hidden)
      for (const attr of ARIA_ATTRS) {
        const dataAttr = `data-${attr}`;
        if (el.hasAttribute(dataAttr)) {
          const c = handleAriaAttr(el, store, el.getAttribute(dataAttr), attr);
          if (c) cleanups.push(c);
        }
      }
    }

    // Event delegation for two-way bindings
    const handler = e => {
      const binding = bindingMap.get(e.target);
      if (binding) binding.target[binding.key] = getInputValue(e.target);
    };
    root.addEventListener("input", handler);
    cleanups.push(() => root.removeEventListener("input", handler));

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
 * Handle boolean properties (hidden, disabled, checked, required)
 */
function handleBooleanProp(el, store, path, propName) {
  const result = resolveProp(store, path);
  if (!result) return null;

  const { target, key } = result;

  return target.$subscribe(key, val => {
    el[propName] = Boolean(val);
  });
}

/**
 * Handle ARIA attributes (aria-expanded, aria-hidden)
 */
function handleAriaAttr(el, store, path, attrName) {
  const result = resolveProp(store, path);
  if (!result) return null;

  const { target, key } = result;

  return target.$subscribe(key, val => {
    el.setAttribute(attrName, val ? 'true' : 'false');
  });
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