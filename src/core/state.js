/**
 * Lume-JS Reactive State Core
 *
 * Provides minimal reactive state with standard JavaScript.
 * Features automatic microtask batching for performance.
 * Supports automatic dependency tracking for effects.
 * Supports optional plugin system for extensibility (v2.0+).
 * 
 * Features:
 * - Lightweight and Go-style
 * - Explicit nested states
 * - $subscribe for listening to key changes
 * - Cleanup with unsubscribe
 * - Per-state microtask batching for writes
 * - Effect dependency tracking support (deduped per state flush)
 * - Plugin system for custom behaviors (v2.0+)
 *
 * Usage:
 *   import { state } from "lume-js";
 *   
 *   // Basic usage (v1.x compatible)
 *   const store = state({ count: 0 });
 *   const unsub = store.$subscribe("count", val => console.log(val));
 *   unsub(); // cleanup
 *   
 *   // With plugins (v2.0+)
 *   const store = state(
 *     { count: 0 },
 *     { plugins: [debugPlugin] }
 *   );
 */

// Per-state batching – each state object maintains its own microtask flush.
// This keeps effects simple and aligned with Lume's minimal philosophy.

/**
 * Creates a reactive state object with optional plugin support.
 * 
 * @param {Object} obj - Initial state object (must be plain object)
 * @param {Object} [options] - Optional configuration
 * @param {Array<Plugin>} [options.plugins] - Array of plugins to apply
 * @returns {Proxy} Reactive proxy with $subscribe method
 * 
 * @example
 * // Basic usage
 * const store = state({ count: 0 });
 * 
 * @example
 * // With plugins
 * const store = state(
 *   { count: 0 },
 *   { 
 *     plugins: [
 *       {
 *         name: 'logger',
 *         onGet: (key, value) => {
 *           console.log(`GET ${key}:`, value);
 *           return value;
 *         }
 *       }
 *     ]
 *   }
 * );
 */
// Internal symbol used to mark reactive proxies (non-enumerable via Proxy trap)
const REACTIVE_MARKER = Symbol('__LUME_REACTIVE__');

export function state(obj, options = {}) {
  // Validate input
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) {
    throw new Error('state() requires a plain object');
  }

  // Extract plugins (minimal validation)
  const plugins = options.plugins || [];

  const listeners = {};
  const pendingNotifications = new Map(); // Per-state pending changes
  const pendingEffects = new Set(); // Dedupe effects per state
  let flushScheduled = false;

  // Call onInit hooks
  for (const p of plugins) {
    try { 
      p.onInit?.(); 
    } catch (e) { 
      console.error(`[Lume.js] Plugin "${p.name}" error in onInit:`, e); 
    }
  }

  /**
   * Schedule a single microtask flush for this state object.
   *
   * Flush order per state:
   * 1) Call plugin onNotify hooks for each changed key
   * 2) Notify subscribers for changed keys (key → subscribers)
   * 3) Run each queued effect exactly once (Set-based dedupe)
   *
   * Notes:
   * - Batching is per state; effects that depend on multiple states
   *   may run once per state that changed (by design).
   * - Plugin onNotify hooks run before subscribers (can observe before notification)
   */
  function scheduleFlush() {
    if (flushScheduled) return;
    
    flushScheduled = true;
    queueMicrotask(() => {
      flushScheduled = false;
      
      // Plugin onNotify hooks (before subscribers)
      for (const [key, value] of pendingNotifications) {
        for (const p of plugins) {
          try { 
            p.onNotify?.(key, value); 
          } catch (e) { 
            console.error(`[Lume.js] Plugin "${p.name}" error in onNotify:`, e); 
          }
        }
      }
      
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
      // Reactive marker check (avoid tracking for internal symbol)
      if (key === REACTIVE_MARKER) return true;
      // Skip effect tracking for internal meta methods (e.g. $subscribe)
      if (typeof key === 'string' && key.startsWith('$')) {
        return target[key];
      }
      
      // Get original value
      let value = target[key];
      
      // Plugin onGet hooks (chain pattern)
      for (const p of plugins) {
        try {
          const r = p.onGet?.(key, value);
          if (r !== undefined) value = r;
        } catch (e) {
          console.error(`[Lume.js] Plugin "${p.name}" error in onGet:`, e);
        }
      }
      
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
      
      return value;
    },
    
    set(target, key, value) {
      const oldValue = target[key];
      let newValue = value;
      
      // Plugin onSet hooks (chain pattern)
      for (const p of plugins) {
        try {
          const r = p.onSet?.(key, newValue, oldValue);
          if (r !== undefined) newValue = r;
        } catch (e) {
          console.error(`[Lume.js] Plugin "${p.name}" error in onSet:`, e);
        }
      }
      
      // Skip update if value unchanged after plugin processing
      if (oldValue === newValue) return true;
      
      target[key] = newValue;
      
      // Batch notifications at the state level (per-state, not global)
      pendingNotifications.set(key, newValue);
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

    // Plugin onSubscribe hooks
    for (const p of plugins) {
      try { 
        p.onSubscribe?.(key); 
      } catch (e) { 
        console.error(`[Lume.js] Plugin "${p.name}" error in onSubscribe:`, e); 
      }
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

/**
 * Determine if an object is a Lume reactive proxy.
 * Defensive: ensures object and marker presence.
 * @param {any} obj
 * @returns {boolean}
 */
export function isReactive(obj) {
  return !!(obj && typeof obj === 'object' && obj[REACTIVE_MARKER]);
}