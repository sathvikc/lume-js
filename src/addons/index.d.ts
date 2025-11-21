/**
 * Lume.js Addons TypeScript Definitions
 * 
 * Optional utilities for advanced reactive patterns.
 * Import from "lume-js/addons" for tree-shaking.
 */

import type { Unsubscribe, Subscriber, ReactiveState } from '../index.js';

/**
 * Computed value container returned by computed().
 * T is the computed result type; when an error occurs the value becomes undefined.
 */
export interface Computed<T> {
  /** Current computed value (undefined if computation threw). */
  readonly value: T | undefined;
  /** Subscribe to changes; immediate invocation with current value (may be undefined). */
  subscribe(callback: Subscriber<T | undefined>): Unsubscribe;
  /** Dispose computed value and stop tracking dependencies. */
  dispose(): void;
}

/**
 * Create a computed value that automatically re-evaluates when accessed reactive state keys change.
 * Uses effect() internally for dependency tracking.
 * 
 * @param fn - Pure function that derives a value from reactive state.
 * @returns Computed value container with .value, .subscribe(), and .dispose()
 * @throws {Error} If fn is not a function
 * 
 * @example
 * ```typescript
 * import { state } from 'lume-js';
 * import { computed } from 'lume-js/addons';
 * 
 * const store = state({ count: 5 });
 * const doubled = computed(() => store.count * 2);
 * 
 * console.log(doubled.value); // 10
 * 
 * store.count = 10;
 * // After microtask:
 * console.log(doubled.value); // 20 (auto-updated)
 * 
 * // Subscribe to changes
 * const unsub = doubled.subscribe(value => {
 *   console.log('Doubled:', value);
 * });
 * 
 * // Cleanup
 * doubled.dispose();
 * unsub();
 * ```
 */
export function computed<T>(fn: () => T): Computed<T>;

/**
 * Watch a single key on a reactive state object; convenience wrapper around $subscribe.
 * 
 * @param store - Reactive state object created with state().
 * @param key - Property key to observe.
 * @param callback - Invoked immediately and on subsequent changes.
 * @returns Unsubscribe function for cleanup
 * @throws {Error} If store is not a reactive state object
 * 
 * @example
 * ```typescript
 * import { state } from 'lume-js';
 * import { watch } from 'lume-js/addons';
 * 
 * const store = state({ count: 0 });
 * 
 * const unwatch = watch(store, 'count', (value) => {
 *   console.log('Count is now:', value);
 * });
 * 
 * // Cleanup
 * unwatch();
 * ```
 */
export function watch<T extends object, K extends keyof T>(
  store: ReactiveState<T>,
  key: K,
  callback: Subscriber<T[K]>
): Unsubscribe;
