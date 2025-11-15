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
 * Bind reactive state to DOM elements
 * 
 * @param root - Root element to scan for [data-bind] attributes
 * @param store - Reactive state object
 * @returns Cleanup function to remove all bindings
 * @throws {Error} If root is not an HTMLElement
 * @throws {Error} If store is not a reactive state object
 * 
 * @example
 * ```typescript
 * const store = state({ count: 0 });
 * const cleanup = bindDom(document.body, store);
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
  store: ReactiveState<any>
): Unsubscribe;