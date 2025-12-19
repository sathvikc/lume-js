/**
 * Lume-JS Effect
 * 
 * Automatic dependency tracking for reactive effects.
 * Tracks which state properties are accessed during execution
 * and automatically re-runs when those properties change.
 * 
 * Part of core because it's fundamental to modern reactivity.
 * 
 * Usage:
 *   import { effect } from "lume-js";
 *   
 *   effect(() => {
 *     console.log('Count is:', store.count);
 *     // Automatically re-runs when store.count changes
 *   });
 * 
 * Features:
 * - Automatic dependency collection
 * - Dynamic dependencies (tracks what you actually access)
 * - Returns cleanup function
 * - Compatible with per-state batching (no global scheduler)
 *
 */

/**
 * Creates an effect that automatically tracks dependencies
 *
 * The effect runs immediately and collects dependencies by tracking
 * which state properties are accessed. When any dependency changes,
 * the effect re-runs automatically.
 * 
 * @param {function} fn - Function to run reactively
 * @returns {function} Cleanup function to stop the effect
 * 
 * @example
 * const store = state({ count: 0, name: 'Alice' });
 * 
 * const cleanup = effect(() => {
 *   // Only tracks 'count' (name not accessed)
 *   document.title = `Count: ${store.count}`;
 * });
 * 
 * store.count = 5;  // Effect re-runs
 * store.name = 'Bob'; // Effect does NOT re-run
 * 
 * cleanup(); // Stop tracking
 */
export function effect(fn) {
  if (typeof fn !== 'function') {
    throw new Error('effect() requires a function');
  }

  const cleanups = [];
  let isRunning = false; // Prevent infinite recursion
  
  /**
   * Execute the effect function and collect dependencies
   *
   * The execution re-tracks accessed keys on every run. Subscriptions
   * are cleaned up and re-established so the effect always reflects
   * current dependencies.
   */
  const execute = () => {
    if (isRunning) return; // Prevent re-entry
    
    // Clean up previous subscriptions
    cleanups.forEach(cleanup => cleanup());
    cleanups.length = 0;
    
    // Create effect context for tracking
    const effectContext = {
      fn,
      cleanups,
      execute, // Reference to this execute function
      tracking: {} // Map of tracked keys
    };
    
    // Set as current effect (for state.js to detect)
    globalThis.__LUME_CURRENT_EFFECT__ = effectContext;
    isRunning = true;
    
    try {
      // Run the effect function (this triggers state getters)
      fn();
    } catch (error) {
      console.error('[Lume.js effect] Error in effect:', error);
      throw error;
    } finally {
      // Always clean up, even if error
      globalThis.__LUME_CURRENT_EFFECT__ = undefined;
      isRunning = false;
    }
  };
  
  // Run immediately to collect initial dependencies
  execute();

  // Return cleanup function
  return () => {
    cleanups.forEach(cleanup => cleanup());
    cleanups.length = 0;
  };
}