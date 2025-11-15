// src/core/state.js
/**
 * Lume-JS Reactive State Core
 *
 * Provides minimal reactive state with standard JavaScript.
 * 
 * Features:
 * - Lightweight and Go-style
 * - Explicit nested states
 * - $subscribe for listening to key changes
 * - Cleanup with unsubscribe
 *
 * Usage:
 *   import { state } from "lume-js";
 *   const store = state({ count: 0 });
 *   const unsub = store.$subscribe("count", val => console.log(val));
 *   unsub(); // cleanup
 */

/**
 * Creates a reactive state object.
 * 
 * @param {Object} obj - Initial state object
 * @returns {Proxy} Reactive proxy with $subscribe method
 */
export function state(obj) {
  // Validate input
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) {
    throw new Error('state() requires a plain object');
  }

  const listeners = {};

  // Notify subscribers of a key
  function notify(key, val) {
    if (listeners[key]) {
      listeners[key].forEach(fn => fn(val));
    }
  }

  const proxy = new Proxy(obj, {
    get(target, key) {
      return target[key];
    },
    set(target, key, value) {
      const oldValue = target[key];
      target[key] = value;
      
      // Only notify if value actually changed
      if (oldValue !== value) {
        notify(key, value);
      }
      return true;
    }
  });

  /**
   * Subscribe to changes for a specific key.
   * Calls the callback immediately with the current value.
   * Returns an unsubscribe function for cleanup.
   * 
   * @param {string} key - Property key to watch
   * @param {function} fn - Callback function
   * @returns {function} Unsubscribe function
   */
  proxy.$subscribe = (key, fn) => {
    if (typeof fn !== 'function') {
      throw new Error('Subscriber must be a function');
    }

    if (!listeners[key]) listeners[key] = [];
    listeners[key].push(fn);
    
    // Call immediately with current value
    fn(proxy[key]);

    // Return unsubscribe function
    return () => {
      if (listeners[key]) {
        listeners[key] = listeners[key].filter(subscriber => subscriber !== fn);
      }
    };
  };

  return proxy;
}