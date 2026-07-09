/**
 * Lume-JS Universal State Entry
 *
 * The DOM-free kernel: reactive state + cross-store batching. Runs anywhere
 * JavaScript runs — Node, Deno, Bun, workers, CLI tools, browsers.
 *
 * Use this entry when you don't need DOM binding:
 *
 *   import { state, batch } from "lume-js/state";
 *
 *   const store = state({ count: 0 });
 *   store.$subscribe("count", v => console.log("count:", v));
 *
 *   batch(() => {
 *     store.count = 1;
 *     store.count = 2;
 *   }); // subscribers see only 2, synchronously
 *
 * For DOM binding and effects, use the full core instead:
 *
 *   import { state, bindDom, effect, batch } from "lume-js";
 */

export { state, withReadObserver } from "./core/state.js";
export { batch } from "./core/batch.js";
