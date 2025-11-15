/**
 * computed - creates a derived value based on state
 * @param {Function} fn - function that computes value from state
 * @returns {Object} - { get: () => value, recompute: () => void, subscribe: (cb) => unsubscribe }
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
    get: () => {
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
      return () => subscribers.delete(cb); // unsubscribe function
    },
  };
}
