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

  /**
   * Brand to identify reactive state objects at the type level
   * @internal
   */
  readonly __reactive?: unique symbol;
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

/**
 * Check if a value is a Lume reactive proxy produced by state().
 * This is a type guard that narrows the type to ReactiveState.
 * 
 * @param obj - Value to check
 * @returns true if obj is a ReactiveState, with type narrowing
 * 
 * @example
 * ```typescript
 * function process(data: unknown) {
 *   if (isReactive(data)) {
 *     // data is now typed as ReactiveState<object>
 *     data.$subscribe('key', () => {});
 *   }
 * }
 * ```
 */
export function isReactive(obj: unknown): obj is ReactiveState<object>;

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