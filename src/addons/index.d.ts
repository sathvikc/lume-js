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

/**
 * Context passed to preservation functions
 */
export interface PreservationContext {
  /** Whether this update is a reorder (vs add/remove) */
  isReorder?: boolean;
}

/**
 * Focus preservation function signature
 * 
 * @param container - The list container element
 * @returns Restore function to call after DOM updates, or null if nothing to restore
 */
export type FocusPreservation = (container: HTMLElement) => (() => void) | null;

/**
 * Scroll preservation function signature
 * 
 * @param container - The list container element
 * @param context - Additional context about the update
 * @returns Restore function to call after DOM updates
 */
export type ScrollPreservation = (container: HTMLElement, context?: PreservationContext) => () => void;

/**
 * Context passed to update callback
 */
export interface UpdateContext {
  /** True on initial render, false on subsequent updates */
  isFirstRender: boolean;
}

/**
 * Options for the repeat() function
 */
export interface RepeatOptions<T> {
  /** Function to extract unique key from item */
  key: (item: T) => string | number;

  /** 
   * Function to render/update an item's element (called for all items on every update)
   * Use for simple cases. For complex cases, prefer create + update pattern.
   */
  render?: (item: T, element: HTMLElement, index: number) => void;

  /**
   * Function called ONCE when element is created (for DOM structure setup)
   * Recommended for event listeners and innerHTML setup
   */
  create?: (item: T, element: HTMLElement, index: number) => void;

  /**
   * Function called on every update for data binding
   * Skipped if same item reference AND same index (optimization)
   */
  update?: (item: T, element: HTMLElement, index: number, context: UpdateContext) => void;

  /** Element tag name or factory function (default: 'div') */
  element?: string | (() => HTMLElement);

  /** 
   * Focus preservation strategy (default: defaultFocusPreservation)
   * Set to null to disable focus preservation
   */
  preserveFocus?: FocusPreservation | null;

  /** 
   * Scroll preservation strategy (default: defaultScrollPreservation)
   * Set to null to disable scroll preservation
   */
  preserveScroll?: ScrollPreservation | null;
}

/**
 * Default focus preservation strategy
 * Saves activeElement and selection state before DOM updates
 * 
 * @param container - The list container element
 * @returns Restore function or null
 * 
 * @example
 * ```typescript
 * import { defaultFocusPreservation } from 'lume-js/addons';
 * 
 * // Use in custom preservation wrapper
 * const myPreservation = (container) => {
 *   console.log('Saving focus...');
 *   const restore = defaultFocusPreservation(container);
 *   return restore ? () => {
 *     restore();
 *     console.log('Focus restored!');
 *   } : null;
 * };
 * ```
 */
export function defaultFocusPreservation(container: HTMLElement): (() => void) | null;

/**
 * Default scroll preservation strategy
 * Uses anchor-based preservation for add/remove, pixel position for reorder
 * 
 * @param container - The list container element
 * @param context - Additional context about the update
 * @returns Restore function
 * 
 * @example
 * ```typescript
 * import { defaultScrollPreservation } from 'lume-js/addons';
 * 
 * // Wrap default behavior
 * const myScrollPreservation = (container, context) => {
 *   const restore = defaultScrollPreservation(container, context);
 *   return () => {
 *     restore();
 *     console.log('Scroll position restored');
 *   };
 * };
 * ```
 */
export function defaultScrollPreservation(container: HTMLElement, context?: PreservationContext): () => void;

/**
 * Efficiently render a list with element reuse by key.
 * 
 * Features:
 * - Element reuse (same DOM nodes, not recreated)
 * - Minimal DOM operations (only updates what changed)
 * - Optional focus preservation (maintains activeElement and selection)
 * - Optional scroll preservation (intelligent positioning)
 * - Fully customizable preservation strategies
 * 
 * @param container - Container element or CSS selector
 * @param store - Reactive state object
 * @param arrayKey - Key in store containing the array
 * @param options - Configuration options
 * @returns Cleanup function
 * 
 * @example
 * ```typescript
 * import { state } from 'lume-js';
 * import { repeat } from 'lume-js/addons';
 * 
 * const store = state({
 *   todos: [
 *     { id: 1, text: 'Learn Lume.js' },
 *     { id: 2, text: 'Build an app' }
 *   ]
 * });
 * 
 * // Basic usage (preservation enabled by default)
 * const cleanup = repeat('#todo-list', store, 'todos', {
 *   key: todo => todo.id,
 *   render: (todo, el) => {
 *     if (!el.dataset.init) {
 *       el.innerHTML = `<input value="${todo.text}">`;
 *       el.dataset.init = 'true';
 *     }
 *   }
 * });
 * 
 * // Disable preservation (bare-bones)
 * repeat('#list', store, 'todos', {
 *   key: todo => todo.id,
 *   render: (todo, el) => { el.textContent = todo.text; },
 *   preserveFocus: null,
 *   preserveScroll: null
 * });
 * 
 * // Custom preservation
 * import { defaultFocusPreservation } from 'lume-js/addons';
 * 
 * repeat('#list', store, 'todos', {
 *   key: todo => todo.id,
 *   render: (todo, el) => { ... },
 *   preserveFocus: (container) => {
 *     // Custom logic
 *     const restore = defaultFocusPreservation(container);
 *     return () => {
 *       restore?.();
 *       console.log('Focus restored');
 *     };
 *   }
 * });
 * 
 * // Cleanup
 * cleanup();
 * ```
 */
export function repeat<T>(
  container: string | HTMLElement,
  store: ReactiveState<any>,
  arrayKey: string,
  options: RepeatOptions<T>
): Unsubscribe;

/**
 * Options for createDebugPlugin
 */
export interface DebugPluginOptions {
  /** Label for log messages (default: 'store') */
  label?: string;
  /** Log property reads - can be noisy (default: false) */
  logGet?: boolean;
  /** Log property writes (default: true) */
  logSet?: boolean;
  /** Log subscriber notifications (default: true) */
  logNotify?: boolean;
  /** Show stack trace for SET operations - helps find where state changes originate (default: false) */
  trace?: boolean;
}

/**
 * State plugin with lifecycle hooks for debugging
 */
export interface DebugPlugin {
  name: string;
  onInit?: () => void;
  onGet?: (key: string, value: any) => any;
  onSet?: (key: string, newValue: any, oldValue: any) => any;
  onSubscribe?: (key: string) => void;
  onNotify?: (key: string, value: any) => void;
}

/**
 * Create a debug plugin instance for a reactive state store.
 * Logs state operations to the console with colored output.
 * 
 * @param options - Configuration options
 * @returns Plugin object for state()
 * 
 * @example
 * ```typescript
 * import { state } from 'lume-js';
 * import { createDebugPlugin } from 'lume-js/addons';
 * 
 * const store = state({ count: 0 }, { 
 *   plugins: [createDebugPlugin({ label: 'counter' })] 
 * });
 * ```
 */
export function createDebugPlugin(options?: DebugPluginOptions): DebugPlugin;

/**
 * Statistics for a single store
 */
export interface DebugStats {
  gets: Record<string, number>;
  sets: Record<string, number>;
  notifies: Record<string, number>;
}

/**
 * Global debug controls for Lume.js
 */
export interface Debug {
  /** Enable debug logging globally */
  enable(): void;
  /** Disable debug logging globally */
  disable(): void;
  /** Check if debug logging is enabled */
  isEnabled(): boolean;
  /** Filter logs by key pattern (string, RegExp, or null to clear) */
  filter(pattern: string | RegExp | null): void;
  /** Get current filter pattern */
  getFilter(): string | RegExp | null;
  /** Get statistics data (silent - no console output) */
  stats(): Record<string, DebugStats>;
  /** Log statistics to console with table formatting */
  logStats(): Record<string, DebugStats>;
  /** Reset all collected statistics */
  resetStats(): void;
}

/**
 * Global debug controls
 * 
 * @example
 * ```typescript
 * import { debug } from 'lume-js/addons';
 * 
 * debug.enable();        // Enable logging
 * debug.filter('count'); // Only log keys containing 'count'
 * debug.stats();         // Show statistics
 * debug.disable();       // Disable logging
 * ```
 */
export const debug: Debug;

