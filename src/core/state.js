/**
 * Lume-JS Reactive State Core
 *
 * Provides minimal reactive state with standard JavaScript.
 * Features automatic microtask batching for performance.
 * Supports automatic dependency tracking for effects.
 * 
 * Features:
 * - Lightweight and Go-style
 * - Explicit nested states
 * - $subscribe for listening to key changes
 * - Cleanup with unsubscribe
 * - Per-state microtask batching for writes
 * - Effect dependency tracking support (deduped per state flush)
 *
 * Usage:
 *   import { state } from "lume-js";
 *   const store = state({ count: 0 });
 *   const unsub = store.$subscribe("count", val => console.log(val));
 *   unsub(); // cleanup
 */

// Per-state batching – each state object maintains its own microtask flush.
// This keeps effects simple and aligned with Lume's minimal philosophy.

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
  const pendingNotifications = new Map(); // Per-state pending changes
  const pendingEffects = new Set(); // Dedupe effects per state
  let flushScheduled = false;

  /**
   * Schedule a single microtask flush for this state object.
   *
   * Flush order per state:
   * 1) Notify subscribers for changed keys (key → subscribers)
   * 2) Run each queued effect exactly once (Set-based dedupe)
   *
   * Notes:
   * - Batching is per state; effects that depend on multiple states
   *   may run once per state that changed (by design).
   */
  function scheduleFlush() {
    if (flushScheduled) return;
    
    flushScheduled = true;
    queueMicrotask(() => {
      flushScheduled = false;
      
      // Notify all subscribers of changed keys
      // Snapshot listeners array to handle unsubscribes during iteration
      for (const [key, value] of pendingNotifications) {
        if (listeners[key]) {
          const subscribersSnapshot = Array.from(listeners[key]);
          subscribersSnapshot.forEach(fn => fn(value));
        }
      }
      
      pendingNotifications.clear();
      
      // Run each effect exactly once (Set deduplicates)
      const effects = Array.from(pendingEffects);
      pendingEffects.clear();
      effects.forEach(effect => effect());
    });
  }

  const proxy = new Proxy(obj, {
    get(target, key) {
      // Support effect tracking
      // Check if we're inside an effect context
      if (typeof globalThis.__LUME_CURRENT_EFFECT__ !== 'undefined') {
        const currentEffect = globalThis.__LUME_CURRENT_EFFECT__;
        
        if (currentEffect && !currentEffect.tracking[key]) {
          // Mark as tracked
          currentEffect.tracking[key] = true;
          
          // Subscribe to changes for this key (skip initial call for effects)
          const unsubscribe = (() => {
            if (!listeners[key]) listeners[key] = [];
            
            const effectFn = () => {
              // Queue effect in this state's pending set
              // Set deduplicates - effect runs once even if multiple keys change
              pendingEffects.add(currentEffect.execute);
            };
            
            listeners[key].push(effectFn);
            
            // Return unsubscribe function (no initial call for effects)
            return () => {
              if (listeners[key]) {
                listeners[key] = listeners[key].filter(subscriber => subscriber !== effectFn);
              }
            };
          })();
          
          // Store cleanup function
          currentEffect.cleanups.push(unsubscribe);
        }
      }
      
      return target[key];
    },
    
    set(target, key, value) {
      const oldValue = target[key];
      if (oldValue === value) return true;
      
      target[key] = value;
      
      // Batch notifications at the state level (per-state, not global)
      pendingNotifications.set(key, value);
      scheduleFlush();
      
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
    
    // Call immediately with current value (NOT batched)
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