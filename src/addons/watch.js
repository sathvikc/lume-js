/**
 * watch - observes changes to a state key and triggers callback
 * @param {Object} store - reactive store created with state()
 * @param {string} key - key in store to watch
 * @param {Function} callback - called with (newValue, previousValue); previous is
 *   the last value delivered to this watcher (undefined on the immediate call)
 * @param {Object} [options]
 * @param {boolean} [options.immediate=true] - call callback immediately with current value
 * @returns {Function} unsubscribe function
 */
export function watch(store, key, callback, { immediate = true } = {}) {
  if (!store.$subscribe) {
    throw new Error("store must be created with state()");
  }
  // With immediate: false the first (subscribe-time) delivery only sets the
  // baseline, so the first change still reports the initial value as previous.
  let deliver = immediate;
  let previous;
  return store.$subscribe(key, (val) => {
    const old = previous;
    previous = val;
    if (deliver) callback(val, old);
    deliver = true;
  });
}
