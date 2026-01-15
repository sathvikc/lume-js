/**
 * Lume-JS Computed Addon
 * 
 * Creates computed values that automatically update when dependencies change.
 * Uses core effect() for automatic dependency tracking.
 * 
 * Usage:
 *   import { computed } from "lume-js/addons/computed";
 *   
 *   const doubled = computed(() => store.count * 2);
 *   console.log(doubled.value); // Auto-updates when store.count changes
 * 
 * Features:
 * - Automatic dependency tracking (no manual recompute)
 * - Cached values (only recomputes when dependencies change)
 * - Subscribe to changes
 * - Cleanup with dispose()
 * 
 * @module addons/computed
 */

import { effect } from '../core/effect.js';

/**
 * Creates a computed value with automatic dependency tracking
 * 
 * The computation function runs immediately and tracks which state
 * properties are accessed. When any dependency changes, the value
 * is automatically recomputed.
 * 
 * @param {function} fn - Function that computes the value
 * @returns {object} Object with .value property and methods
 * 
 * @example
 * const store = state({ count: 5 });
 * 
 * const doubled = computed(() => store.count * 2);
 * console.log(doubled.value); // 10
 * 
 * store.count = 10;
 * // After microtask:
 * console.log(doubled.value); // 20 (auto-updated)
 * 
 * @example
 * // Subscribe to changes
 * const unsub = doubled.subscribe(value => {
 *   console.log('Doubled changed to:', value);
 * });
 * 
 * @example
 * // Cleanup
 * doubled.dispose();
 */
export function computed(fn) {
  if (typeof fn !== 'function') {
    throw new Error('computed() requires a function');
  }

  let cachedValue;
  let isInitialized = false;
  const subscribers = [];

  // Use effect to automatically track dependencies
  const cleanupEffect = effect(() => {
    try {
      const newValue = fn();

      // Check if value actually changed - Object.is() handles NaN and -0
      if (!isInitialized || !Object.is(newValue, cachedValue)) {
        cachedValue = newValue;
        isInitialized = true;

        // Notify all subscribers
        subscribers.forEach(callback => callback(cachedValue));
      }
    } catch (error) {
      console.error('[Lume.js computed] Error in computation:', error);
      // Set to undefined on error, mark as initialized
      if (!isInitialized || cachedValue !== undefined) {
        cachedValue = undefined;
        isInitialized = true;

        // Notify subscribers of error state
        subscribers.forEach(callback => callback(cachedValue));
      }
    }
  });

  return {
    /**
     * Get the current computed value
     */
    get value() {
      if (!isInitialized) {
        throw new Error('Computed value accessed before initialization');
      }
      return cachedValue;
    },

    /**
     * Subscribe to changes in computed value
     * 
     * @param {function} callback - Called when value changes
     * @returns {function} Unsubscribe function
     */
    subscribe(callback) {
      if (typeof callback !== 'function') {
        throw new Error('subscribe() requires a function');
      }

      subscribers.push(callback);

      // Call immediately with current value
      if (isInitialized) {
        callback(cachedValue);
      }

      // Return unsubscribe function
      return () => {
        const index = subscribers.indexOf(callback);
        if (index > -1) {
          subscribers.splice(index, 1);
        }
      };
    },

    /**
     * Clean up computed value and stop tracking
     */
    dispose() {
      cleanupEffect();
      subscribers.length = 0;
      isInitialized = false;
    }
  };
}