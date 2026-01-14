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
 * Plugin interface for extending state behavior
 * 
 * All hooks are optional. Hooks execute in the order plugins are registered.
 * 
 * @example
 * ```typescript
 * const debugPlugin: Plugin = {
 *   name: 'debug',
 *   onGet: (key, value) => {
 *     console.log(`GET ${key}:`, value);
 *     return value; // Return value to pass to next plugin
 *   },
 *   onSet: (key, newValue, oldValue) => {
 *     console.log(`SET ${key}:`, oldValue, '→', newValue);
 *     return newValue; // Return value to pass to next plugin
 *   }
 * };
 * 
 * const store = state({ count: 0 }, { plugins: [debugPlugin] });
 * ```
 */
export interface Plugin {
  /**
   * Plugin name (for debugging)
   */
  name: string;

  /**
   * Called when state object is created
   * Runs synchronously before Proxy is returned
   */
  onInit?(): void;

  /**
   * Called when a property is accessed (before value returned)
   * Can transform the value by returning a new value
   * 
   * Chain pattern: Each plugin receives the output of the previous plugin
   * 
   * @param key - Property key being accessed
   * @param value - Current value (possibly transformed by previous plugins)
   * @returns Transformed value, or undefined to keep current value
   */
  onGet?(key: string, value: any): any;

  /**
   * Called when a property is updated (before subscribers notified)
   * Can transform or validate the new value
   * 
   * Chain pattern: Each plugin receives the output of the previous plugin
   * 
   * @param key - Property key being updated
   * @param newValue - New value being set (possibly transformed by previous plugins)
   * @param oldValue - Previous value
   * @returns Transformed value, or undefined to keep current value
   */
  onSet?(key: string, newValue: any, oldValue: any): any;

  /**
   * Called when a subscriber is added
   * Useful for tracking active subscriptions
   * 
   * @param key - Property key being subscribed to
   */
  onSubscribe?(key: string): void;

  /**
   * Called when subscribers are about to be notified
   * Runs in microtask, before subscribers receive value
   * 
   * @param key - Property key that changed
   * @param value - New value being notified
   */
  onNotify?(key: string, value: any): void;
}

/**
 * Options for state creation
 */
export interface StateOptions {
  /**
   * Array of plugins to apply to this state object
   * Plugins execute in the order they are registered
   */
  plugins?: Plugin[];
}

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
 * 
 * @example
 * ```typescript
 * // With plugins
 * const store = state(
 *   { count: 0 },
 *   { 
 *     plugins: [
 *       {
 *         name: 'logger',
 *         onGet: (key, value) => {
 *           console.log(`GET ${key}:`, value);
 *           return value;
 *         }
 *       }
 *     ]
 *   }
 * );
 * ```
 */
export function state<T extends object>(
  obj: T,
  options?: StateOptions
): ReactiveState<T>;

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
 * Dependency tuple for explicit effect tracking
 * Format: [store, key1, key2, ...] where store is a ReactiveState and keys are property names
 */
export type EffectDependency = [ReactiveState<any>, ...string[]];

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

/**
 * Check if a value is a Lume reactive proxy produced by state().
 * Returns true only for objects created by state().
 * @param obj - Value to check
 */
export function isReactive(obj: any): boolean;