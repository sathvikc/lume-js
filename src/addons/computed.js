/**
 * computed - creates a derived value based on state
 * 
 * NOTE: This is a basic implementation. For production use,
 * consider more robust solutions with automatic dependency tracking.
 * 
 * @param {Function} fn - function that computes value from state
 * @returns {Object} - { value, recompute, subscribe }
 * 
 * @example
 * const store = state({ count: 0 });
 * const doubled = computed(() => store.count * 2);
 * 
 * // Subscribe to changes
 * doubled.subscribe(val => console.log('Doubled:', val));
 * 
 * // Manually trigger recomputation after state changes
 * store.$subscribe('count', () => doubled.recompute());
 */
export function computed(fn) {
  let value;
  let dirty = true;
  const subscribers = new Set();

  const recalc = () => {
    try {
      value = fn();
    } catch (err) {
      console.error("[computed] Error computing value:", err);
      value = undefined;
    }
    dirty = false;
    subscribers.forEach(cb => cb(value));
  };

  return {
    get value() {
      if (dirty) recalc();
      return value;
    },
    recompute: () => {
      dirty = true;
      recalc();
    },
    subscribe: cb => {
      subscribers.add(cb);
      // Immediately notify subscriber with current value
      if (!dirty) cb(value);
      else recalc(); // Compute first time
      return () => subscribers.delete(cb); // unsubscribe function
    },
  };
}