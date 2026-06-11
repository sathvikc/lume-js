/**
 * Lume.js Universal State Entry — TypeScript Definitions
 *
 * The DOM-free kernel: state() + batch() + withReadObserver().
 * Import from "lume-js/state" in Node, Deno, workers, and CLI tools.
 * Types are shared with the full core entry.
 */

export type {
  Unsubscribe,
  Subscriber,
  Plugin,
  TypedPlugin,
  ReactiveState,
} from './index.js';

export { state, batch, withReadObserver } from './index.js';
