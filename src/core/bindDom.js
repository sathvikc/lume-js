// src/core/bindDom.js
/**
 * Lume-JS DOM Binding
 *
 * Binds reactive state to DOM elements using [data-bind].
 * Supports two-way binding for INPUT/TEXTAREA/SELECT.
 *
 * Usage:
 *   import { bindDom } from "lume-js";
 *   const cleanup = bindDom(document.body, store);
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
 * @returns {function} Cleanup function to remove all bindings
 */
export function bindDom(root, store) {
  if (!(root instanceof HTMLElement)) {
    throw new Error('bindDom() requires a valid HTMLElement as root');
  }

  if (!store || typeof store !== 'object') {
    throw new Error('bindDom() requires a reactive state object');
  }

  const nodes = root.querySelectorAll("[data-bind]");
  const cleanups = [];

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

    // Two-way binding for form inputs
    if (isFormInput(el)) {
      const handler = e => {
        target[lastKey] = getInputValue(e.target);
      };
      el.addEventListener("input", handler);
      cleanups.push(() => el.removeEventListener("input", handler));
    }
  });

  return () => {
    cleanups.forEach(cleanup => cleanup());
  };
}

/**
 * Update DOM element with new value
 * @private
 */
function updateElement(el, val) {
  if (el.tagName === "INPUT") {
    if (el.type === "checkbox") {
      el.checked = Boolean(val);
    } else if (el.type === "radio") {
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