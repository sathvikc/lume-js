/**
 * Creates a cleanup group that can collect and dispose multiple
 * cleanup/unsubscribe functions at once.
 *
 * @returns {CleanupGroup}
 *
 * @example
 * ```js
 * import { createCleanupGroup } from 'lume-js/addons';
 *
 * const group = createCleanupGroup();
 * group.add(bindDom(root, store));
 * group.add(effect(() => { ... }));
 * group.add(store.$subscribe('key', fn));
 *
 * // Dispose everything at once
 * group.dispose();
 * ```
 */
export function createCleanupGroup() {
  const cleanups = [];

  return {
    /**
     * Add a cleanup function to the group.
     * @param {Function} fn - Cleanup/unsubscribe function
     */
    add(fn) {
      if (typeof fn === 'function') {
        cleanups.push(fn);
      }
    },

    /**
     * Run all collected cleanup functions and clear the group.
     */
    dispose() {
      while (cleanups.length) {
        const fn = cleanups.pop();
        try { fn(); } catch (e) { /* ignore cleanup errors */ }
      }
    },
  };
}
