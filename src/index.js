/**
 * Lume-JS Library Core API
 *
 * Exposes:
 * - state(): create reactive state
 * - bindDom(): zero-runtime DOM binding
 * - effect(): reactive effect with automatic dependency tracking
 * - batch(): group writes across states, flush once synchronously
 * - withReadObserver(): advanced API for custom reactive primitives
 *
 * Usage:
 *   import { state, bindDom, effect, batch } from "lume-js";
 */

export { state, withReadObserver } from "./core/state.js";
export { batch } from "./core/batch.js";
export { bindDom } from "./core/bindDom.js";
export { effect } from "./core/effect.js";
