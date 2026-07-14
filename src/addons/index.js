import { REACTIVE_BRAND } from "../core/state.js";

export { computed } from "./computed.js";
export { watch } from "./watch.js";
export { repeat, defaultFocusPreservation, defaultScrollPreservation } from "./repeat.js";
export { createDebugPlugin, debug } from "./debug.js";
export { withPlugins } from "./withPlugins.js";
export { createCleanupGroup } from "./cleanupGroup.js";
export { hydrateState } from "./hydrateState.js";
export { persist } from "./persist.js";
export { renderQueue } from "./renderQueue.js";

/**
 * Returns true if the value is a Lume reactive proxy created by state().
 *
 * Checks the shared reactive brand first (a registry symbol stamped by
 * state(), reliable across module copies), then falls back to duck-typing
 * ($subscribe) for proxies from older lume-js versions whose brand was not
 * shared. The brand check uses the `in` operator, which does not pass
 * through the proxy `get` trap — calling isReactive inside an effect does
 * not create a spurious dependency.
 *
 * @param {any} obj
 * @returns {boolean}
 */
export function isReactive(obj) {
  return !!(obj && typeof obj === 'object' &&
    (REACTIVE_BRAND in obj || typeof obj.$subscribe === 'function'));
}
