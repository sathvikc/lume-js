/**
 * Lume.js Universal State Entry — TypeScript Definitions
 *
 * Source of truth for the DOM-free kernel: state(), batch(),
 * withReadObserver() and their types. This file must type-check WITHOUT
 * lib.dom — it is what `lume-js/state` consumers in Node, Deno, and
 * workers resolve (the full `lume-js` entry re-exports everything here
 * and adds the DOM-flavored API on top).
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
 * Internal unique symbol for reactive state branding
 * @internal
 */
declare const lumeReactiveSymbol: unique symbol;

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
 * const store = withPlugins(state({ count: 0 }), [debugPlugin]);
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
 * Type-safe plugin interface for when you know the state shape.
 * Provides better intellisense for key names and value types.
 * 
 * @example
 * ```typescript
 * interface AppState {
 *   count: number;
 *   name: string;
 * }
 * 
 * const myPlugin: TypedPlugin<AppState> = {
 *   name: 'typed',
 *   onSet: (key, newValue, oldValue) => {
 *     // key is 'count' | 'name', values are properly typed
 *     return newValue;
 *   }
 * };
 * ```
 */
export interface TypedPlugin<T extends object> {
  name: string;
  onInit?(): void;
  onGet?<K extends keyof T>(key: K, value: T[K]): T[K] | undefined;
  onSet?<K extends keyof T>(key: K, newValue: T[K], oldValue: T[K]): T[K] | undefined;
  onSubscribe?<K extends keyof T>(key: K): void;
  onNotify?<K extends keyof T>(key: K, value: T[K]): void;
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

  /**
   * Register a callback to run before each flush.
   * Dedupes duplicate function references.
   * @param fn - Callback function
   * @returns Unsubscribe function for cleanup
   */
  $beforeFlush(fn: () => void): Unsubscribe;

  /**
   * Brand to identify reactive state objects at the type level
   * @internal
   */
  readonly [lumeReactiveSymbol]?: true;
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
 */
export function state<T extends object>(obj: T): ReactiveState<T>;

/**
 * Group multiple state writes and flush them together, synchronously,
 * when the outermost batch() returns.
 *
 * Guarantees:
 * - Subscribers see only the final value of each key written in the batch.
 * - An effect depending on several stores mutated in the batch runs exactly
 *   ONCE (normal microtask batching is per-state: such effects run once per
 *   mutated store).
 * - Nested batch() calls are absorbed into the outermost batch.
 * - If fn throws, writes made before the throw still flush, then the error
 *   propagates.
 *
 * fn must be synchronous. Writes after an `await` fall back to normal
 * per-state microtask flushing (a console warning is logged if fn returns
 * a Promise).
 *
 * @param fn - Function performing state writes
 * @returns The return value of fn
 * @throws {Error} If fn is not a function
 *
 * @example
 * ```typescript
 * import { state, effect, batch } from 'lume-js';
 *
 * const a = state({ value: 1 });
 * const b = state({ value: 2 });
 *
 * effect(() => {
 *   render(a.value + b.value);
 * });
 *
 * batch(() => {
 *   a.value = 10;
 *   b.value = 20;
 * }); // render() ran exactly once, seeing 30
 * ```
 */
export function batch<T>(fn: () => T): T;

/**
 * Run a function with a read observer active.
 *
 * The observer receives `(proxy, key, registerEffect)` for every property read
 * during the synchronous execution of `fn`. Used internally by `effect()` for
 * auto-tracking, and exposed for building custom reactive primitives.
 *
 * @param onRead - Called on each property access inside fn
 * @param fn - The function to run under observation
 * @returns The return value of fn
 *
 * @internal
 */
export function withReadObserver<T>(
  onRead: (
    proxy: ReactiveState<any>,
    key: string,
    registerEffect: (key: string, executeFn: () => void) => () => void
  ) => void,
  fn: () => T
): T;
