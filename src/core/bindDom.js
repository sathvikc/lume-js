/**
 * Lume-JS Zero-runtime DOM binding
 *
 * Binds reactive state to DOM elements using [data-bind].
 * Supports two-way binding for INPUT/TEXTAREA.
 *
 * Usage:
 *   import { bindDom } from "lume-js";
 *   bindDom(document.body, store);
 *
 * HTML:
 *   <span data-bind="count"></span>
 *   <input data-bind="user.name">
 */

import { resolvePath } from "./utils.js";

/**
 * Zero-runtime DOM binding for a reactive store
 * 
 * @param {HTMLElement} root - root element to scan for [data-bind]
 * @param {object} store - reactive state object
 */
export function bindDom(root, store) {
  const nodes = root.querySelectorAll("[data-bind]");

  nodes.forEach(el => {
    const pathArr = el.getAttribute("data-bind").split(".");
    const lastKey = pathArr.pop();

    let target;
    try {
      target = resolvePath(store, pathArr); // must be wrapped with state() if nested
    } catch (err) {
      console.warn(`Skipping binding for ${el}: ${err.message}`);
      return;
    }

    // Subscribe once
    target.$subscribe(lastKey, val => {
      if (el.tagName === "INPUT" || el.tagName === "TEXTAREA") el.value = val;
      else el.textContent = val;
    });

    // 2-way binding for inputs
    if (el.tagName === "INPUT" || el.tagName === "TEXTAREA") {
      el.addEventListener("input", e => target[lastKey] = e.target.value);
    }
  });
}
