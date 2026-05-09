/**
 * watch - observes changes to a state key and triggers callback
 * @param {Object} store - reactive store created with state()
 * @param {string} key - key in store to watch
 * @param {Function} callback - called with new value
 * @param {Object} [options]
 * @param {boolean} [options.immediate=true] - call callback immediately with current value
 * @returns {Function} unsubscribe function
 */
export function watch(store, key, callback, { immediate = true } = {}) {
  if (!store.$subscribe) {
    throw new Error("store must be created with state()");
  }
  if (!immediate) {
    let skipped = false;
    return store.$subscribe(key, (val) => {
      if (!skipped) { skipped = true; return; }
      callback(val);
    });
  }
  return store.$subscribe(key, callback);
}