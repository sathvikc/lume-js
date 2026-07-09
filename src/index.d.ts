/**
 * Lume.js TypeScript Definitions
 * 
 * Provides type safety for reactive state management
 */

// ── Kernel types & functions ─────────────────────────────────────────────
// The DOM-free kernel (state, batch, withReadObserver and their types)
// lives in ./state.d.ts — the source of truth for the `lume-js/state`
// entry, which must type-check without lib.dom (Node/worker consumers).
// This entry re-exports the kernel and adds the DOM-flavored API.

export type {
  Unsubscribe,
  Subscriber,
  Plugin,
  TypedPlugin,
  ReactiveState,
} from './state.js';

export { state, batch, withReadObserver } from './state.js';

import type { ReactiveState, Unsubscribe } from './state.js';

/**
 * Handler interface for extending bindDom with custom reactive data-* attributes.
 * Create plain objects matching this shape — no framework API needed.
 *
 * @example
 * ```typescript
 * const tooltip: Handler = {
 *   attr: 'data-tooltip',
 *   apply(el, val) { el.title = val ?? ''; }
 * };
 * bindDom(root, store, { handlers: [tooltip] });
 * ```
 */
export interface Handler {
  /** Data attribute name (e.g., 'data-show', 'data-class-active') */
  readonly attr: string;
  /** Apply the reactive value to the element */
  apply(el: HTMLElement, val: any): void;
}

/**
 * Options for bindDom function
 */
export interface BindDomOptions {
  /**
   * Skip auto-wait for DOM, bind immediately
   * @default false
   */
  immediate?: boolean;

  /**
   * Additional handlers for reactive data-* attributes.
   * Handlers can be individual objects or arrays (auto-flattened).
   * User handlers override built-in handlers with the same attr.
   *
   * Built-in handlers (always active): data-hidden, data-disabled,
   * data-checked, data-required, data-aria-expanded, data-aria-hidden
   *
   * @example
   * ```typescript
   * import { show, classToggle } from 'lume-js/handlers';
   * bindDom(root, store, { handlers: [show, classToggle('active')] });
   * ```
   */
  handlers?: (Handler | Handler[])[];
}

/**
 * Bind reactive state to DOM elements
 * 
 * Supported attributes:
 * - `data-bind` - Two-way binding for inputs, textContent for others
 * - `data-hidden` - Toggles hidden (truthy = hidden)
 * - `data-disabled` - Toggles disabled (truthy = disabled)
 * - `data-checked` - Toggles checked (for checkboxes/radios)
 * - `data-required` - Toggles required (truthy = required)
 * - `data-aria-expanded` - Sets aria-expanded to "true"/"false"
 * - `data-aria-hidden` - Sets aria-hidden to "true"/"false"
 * 
 * @param root - Root element to scan
 * @param store - Reactive state object
 * @param options - Optional configuration
 * @returns Cleanup function to remove all bindings
 * 
 * @example
 * ```typescript
 * const store = state({ 
 *   name: 'Alice',
 *   isHidden: false,
 *   isDisabled: false,
 *   menuOpen: false
 * });
 * 
 * const cleanup = bindDom(document.body, store);
 * ```
 * 
 * HTML:
 * ```html
 * <input data-bind="name">
 * <div data-hidden="isHidden">Content</div>
 * <button data-disabled="isDisabled">Submit</button>
 * <button data-aria-expanded="menuOpen">Menu</button>
 * ```
 */
export function bindDom(
  root: HTMLElement,
  store: ReactiveState<any>,
  options?: BindDomOptions
): Unsubscribe;

/**
 * Dependency tuple for explicit effect tracking
 * Format: [store, key1, key2, ...] where store is a ReactiveState and keys are property names
 */
export type EffectDependency = [ReactiveState<any>, ...string[]];

/**
 * Type-safe dependency tuple that validates keys against the state type.
 * Use this when you want compile-time validation of dependency keys.
 * 
 * @example
 * ```typescript
 * const store = state({ count: 0, name: 'Alice' });
 * 
 * // Type-safe: 'count' is validated as a key of store
 * const deps: TypedEffectDependency<typeof store>[] = [[store, 'count']];
 * 
 * // Error: 'invalid' is not a key of store
 * const badDeps: TypedEffectDependency<typeof store>[] = [[store, 'invalid']];
 * ```
 */
export type TypedEffectDependency<T extends ReactiveState<any>> =
  T extends ReactiveState<infer U>
  ? [T, ...(keyof U & string)[]]
  : never;

/**
 * Create an effect with auto-tracking (default mode)
 * 
 * The effect runs immediately and re-runs when any accessed state properties change.
 * Only tracks properties that are actually accessed during execution.
 * 
 * @param fn - Function to run reactively
 * @returns Cleanup function to stop the effect
 * @throws {Error} If fn is not a function
 * 
 * @example
 * ```typescript
 * const store = state({ count: 0, name: 'Alice' });
 * 
 * const cleanup = effect(() => {
 *   // Only tracks 'count' (name not accessed)
 *   console.log(`Count: ${store.count}`);
 * });
 * 
 * store.count = 5;    // Effect re-runs
 * store.name = 'Bob'; // Effect does NOT re-run
 * 
 * cleanup(); // Stop the effect
 * ```
 */
export function effect(fn: () => void): Unsubscribe;

/**
 * Create an effect with explicit dependencies (no magic)
 * 
 * The effect runs immediately and re-runs ONLY when specified dependencies change.
 * Does not auto-track any state access. Ideal for side-effects like logging.
 * 
 * @param fn - Function to run reactively
 * @param deps - Array of [store, key] tuples specifying exact dependencies
 * @returns Cleanup function to stop the effect
 * @throws {Error} If fn is not a function
 * 
 * @example
 * ```typescript
 * const store = state({ count: 0 });
 * 
 * // Explicit: only re-runs when store.count changes
 * const cleanup = effect(() => {
 *   analytics.track('count', store.count);
 * }, [[store, 'count']]);
 * 
 * cleanup(); // Stop the effect
 * ```
 */
export function effect(fn: () => void, deps: EffectDependency[]): Unsubscribe;

// ============================================================================
// Utility Types
// ============================================================================

/**
 * Extract the underlying state type from a ReactiveState
 * 
 * @example
 * ```typescript
 * const store = state({ count: 0, name: 'Alice' });
 * type Store = UnwrapReactive<typeof store>;
 * // Store = { count: number; name: string }
 * ```
 */
export type UnwrapReactive<T> = T extends ReactiveState<infer U> ? U : never;

/**
 * Get all subscribable keys from a reactive state
 * 
 * @example
 * ```typescript
 * const store = state({ count: 0, name: 'Alice' });
 * type Keys = ReactiveKeys<typeof store>;
 * // Keys = 'count' | 'name'
 * ```
 */
export type ReactiveKeys<T> = T extends ReactiveState<infer U> ? keyof U : never;

/**
 * Make all properties of T required and non-nullable.
 * Useful for ensuring complete state initialization.
 */
export type RequiredState<T> = {
  [K in keyof T]-?: NonNullable<T[K]>;
};

/**
 * Deep readonly type for immutable state snapshots
 */
export type DeepReadonly<T> = T extends object
  ? { readonly [K in keyof T]: DeepReadonly<T[K]> }
  : T;