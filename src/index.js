/**
 * Lume-JS Library Core API
 *
 * Exposes:
 * - state(): create reactive state
 * - bindDom(): zero-runtime DOM binding
 * - effect(): reactive effect with automatic dependency tracking
 *
 * Usage:
 *   import { state, bindDom, effect } from "lume-js";
 */

export { state, isReactive } from "./core/state.js";
export { bindDom } from "./core/bindDom.js";
export { effect } from "./core/effect.js";
