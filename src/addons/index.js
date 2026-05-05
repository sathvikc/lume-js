export { computed } from "./computed.js";
export { watch } from "./watch.js";
export { repeat, defaultFocusPreservation, defaultScrollPreservation } from "./repeat.js";
export { createDebugPlugin, debug } from "./debug.js";
export { withPlugins } from "./withPlugins.js";
export { createCleanupGroup } from "./cleanupGroup.js";
export { hydrateState } from "./hydrateState.js";

/**
 * Returns true if the value is a Lume reactive proxy created by state().
 * Uses duck-typing: checks for the presence of $subscribe.
 * @param {any} obj
 * @returns {boolean}
 */
export function isReactive(obj) {
  return !!(obj && typeof obj === 'object' && typeof obj.$subscribe === 'function');
}
