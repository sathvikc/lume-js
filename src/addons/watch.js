/**
 * watch - observes changes to a state key and triggers callback
 * @param {Object} store - reactive store created with state()
 * @param {string} key - key in store to watch
 * @param {Function} callback - called with new value
 */
export function watch(store, key, callback) {
  if (!store.subscribe) {
    throw new Error("store must be created with state()");
  }
  store.subscribe(key, callback);
}
