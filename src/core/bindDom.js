// src/core/bindDom.js
/**
 * Lume-JS DOM Binding
 *
 * Binds reactive state to DOM elements using [data-bind].
 * Supports two-way binding for INPUT/TEXTAREA/SELECT.
 * 
 * Automatically waits for DOMContentLoaded if the document is still loading,
 * ensuring safe binding regardless of when the function is called.
 *
 * Usage:
 *   import { bindDom } from "lume-js";
 *   
 *   // Default: Auto-waits for DOM (safe anywhere)
 *   const cleanup = bindDom(document.body, store);
 *   
 *   // Advanced: Force immediate binding (no auto-wait)
 *   const cleanup = bindDom(myElement, store, { immediate: true });
 *   
 *   // Later: cleanup();
 *
 * HTML:
 *   <span data-bind="count"></span>
 *   <input data-bind="user.name">
 *   <select data-bind="theme"></select>
 */

import { resolvePath } from "./utils.js";

/**
 * DOM binding for reactive state
 * 
 * @param {HTMLElement} root - Root element to scan for [data-bind]
 * @param {object} store - Reactive state object
 * @param {object} [options] - Optional configuration
 * @param {boolean} [options.immediate=false] - Skip auto-wait, bind immediately
 * @returns {function} Cleanup function to remove all bindings
 */
export function bindDom(root, store, options = {}) {
  if (!(root instanceof HTMLElement)) {
    throw new Error('bindDom() requires a valid HTMLElement as root');
  }

  if (!store || typeof store !== 'object') {
    throw new Error('bindDom() requires a reactive state object');
  }

  const { immediate = false } = options;

  // Core binding logic extracted to separate function
  const performBinding = () => {
    const nodes = root.querySelectorAll("[data-bind]");
    const cleanups = [];

    // Map for event delegation: element → { target, lastKey }
    const bindingMap = new Map();

    nodes.forEach(el => {
      const bindPath = el.getAttribute("data-bind");

      if (!bindPath) {
        console.warn('[Lume.js] Empty data-bind attribute found', el);
        return;
      }

      const pathArr = bindPath.split(".");
      const lastKey = pathArr.pop();

      let target;
      try {
        target = resolvePath(store, pathArr);
      } catch (err) {
        console.warn(`[Lume.js] Invalid binding path "${bindPath}":`, err.message);
        return;
      }

      if (!target || typeof target.$subscribe !== 'function') {
        console.warn(`[Lume.js] Target for "${bindPath}" is not a reactive state object`);
        return;
      }

      // Subscribe to changes - receives already-batched notifications
      const unsubscribe = target.$subscribe(lastKey, val => {
        updateElement(el, val);
      });
      cleanups.push(unsubscribe);

      // Store binding info for event delegation (form inputs only)
      if (isFormInput(el)) {
        bindingMap.set(el, { target, lastKey });
      }
    });

    // Event delegation: single listener on root for all form inputs
    const delegatedHandler = e => {
      const el = e.target;
      const binding = bindingMap.get(el);
      if (binding) {
        binding.target[binding.lastKey] = getInputValue(el);
      }
    };

    root.addEventListener("input", delegatedHandler);
    cleanups.push(() => root.removeEventListener("input", delegatedHandler));

    return () => {
      cleanups.forEach(cleanup => cleanup());
      bindingMap.clear();
    };
  };

  // Auto-wait for DOM if needed (unless immediate flag is set)
  if (!immediate && document.readyState === 'loading') {
    let cleanup = null;
    const onReady = () => {
      cleanup = performBinding();
    };
    document.addEventListener('DOMContentLoaded', onReady, { once: true });

    // Return cleanup function that handles both cases
    return () => {
      if (cleanup) {
        cleanup();
      } else {
        // If cleanup hasn't been created yet, remove the event listener
        document.removeEventListener('DOMContentLoaded', onReady);
      }
    };
  }

  // Immediate binding (DOM already ready or immediate flag set)
  return performBinding();
}

/**
 * Update DOM element with new value
 * @private
 */
function updateElement(el, val) {
  if (el.tagName === "INPUT") {
    if (el.type === "checkbox") {
      // Single checkbox: bind to boolean value
      // For multiple checkboxes, use nested state objects:
      //   <input data-bind="tags.javascript"> → state({ tags: state({ javascript: true }) })
      el.checked = Boolean(val);
    } else if (el.type === "radio") {
      // Radio: checked when el.value matches state value
      // String() handles null/undefined gracefully (no radio selected)
      el.checked = el.value === String(val);
    } else {
      el.value = val ?? '';
    }
  } else if (el.tagName === "TEXTAREA") {
    el.value = val ?? '';
  } else if (el.tagName === "SELECT") {
    el.value = val ?? '';
  } else {
    el.textContent = val ?? '';
  }
}

/**
 * Get value from form input
 * @private
 */
function getInputValue(el) {
  if (el.type === "checkbox") {
    return el.checked;
  } else if (el.type === "number" || el.type === "range") {
    return el.valueAsNumber;
  }
  return el.value;
}

/**
 * Check if element is a form input
 * @private
 */
function isFormInput(el) {
  return el.tagName === "INPUT" ||
    el.tagName === "TEXTAREA" ||
    el.tagName === "SELECT";
}