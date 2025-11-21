/**
 * Lume.js TypeScript Definitions
 * 
 * Provides type safety for reactive state management
 */

/**
 * Unsubscribe function returned by $subscribe
 */
export type Unsubscribe = () => void;

/**
 * Subscriber callback function
 */
export type Subscriber<T> = (value: T) => void;

/**
 * Reactive state object with $subscribe method
 */
export type ReactiveState<T extends object> = T & {
  /**
   * Subscribe to changes on a specific property key
   * @param key - Property key to watch
   * @param callback - Function called when property changes
   * @returns Unsubscribe function for cleanup
   */
  $subscribe<K extends keyof T>(
    key: K,
    callback: Subscriber<T[K]>
  ): Unsubscribe;
};

/**
 * Create a reactive state object
 * 
 * @param obj - Plain object to make reactive
 * @returns Reactive proxy with $subscribe method
 * @throws {Error} If obj is not a plain object
 * 
 * @example
 * ```typescript
 * const store = state({
 *   count: 0,
 *   user: state({
 *     name: 'Alice'
 *   })
 * });
 * 
 * store.count++; // Triggers reactivity
 * 
 * const unsub = store.$subscribe('count', (val) => {
 *   console.log('Count:', val);
 * });
 * 
 * // Cleanup
 * unsub();
 * ```
 */
export function state<T extends object>(obj: T): ReactiveState<T>;

/**
 * Options for bindDom function
 */
export interface BindDomOptions {
  /**
   * Skip auto-wait for DOM, bind immediately
   * @default false
   */
  immediate?: boolean;
}

/**
 * Bind reactive state to DOM elements
 * 
 * Automatically waits for DOMContentLoaded if the document is still loading,
 * ensuring safe binding regardless of when the function is called.
 * 
 * @param root - Root element to scan for [data-bind] attributes
 * @param store - Reactive state object
 * @param options - Optional configuration
 * @returns Cleanup function to remove all bindings
 * @throws {Error} If root is not an HTMLElement
 * @throws {Error} If store is not a reactive state object
 * 
 * @example
 * ```typescript
 * // Default: Auto-waits for DOM (safe anywhere)
 * const store = state({ count: 0 });
 * const cleanup = bindDom(document.body, store);
 * 
 * // Advanced: Force immediate binding (no auto-wait)
 * const cleanup = bindDom(myElement, store, { immediate: true });
 * 
 * // Later: cleanup all bindings
 * cleanup();
 * ```
 * 
 * HTML:
 * ```html
 * <span data-bind="count"></span>
 * <input data-bind="name">
 * ```
 */
export function bindDom(
  root: HTMLElement,
  store: ReactiveState<any>,
  options?: BindDomOptions
): Unsubscribe;

/**
 * Create an effect that automatically tracks dependencies
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
 * Check if a value is a Lume reactive proxy produced by state().
 * Returns true only for objects created by state().
 * @param obj - Value to check
 */
export function isReactive(obj: any): boolean;