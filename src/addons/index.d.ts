/**
 * Lume.js Addons TypeScript Definitions
 * 
 * Optional utilities for advanced reactive patterns.
 * Import from "lume-js/addons" for tree-shaking.
 */

import type { Unsubscribe, Subscriber, ReactiveState, TypedPlugin } from '../index.js';

export type { TypedPlugin };

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

export interface WatchOptions {
  /**
   * Whether to call the callback immediately with the current value (default: true).
   * Set to false to skip the initial call and only react to future changes.
   */
  immediate?: boolean;
}

/**
 * Watch a single key on a reactive state object; convenience wrapper around $subscribe.
 *
 * By default the callback fires immediately with the current value, then on every change.
 * Pass `{ immediate: false }` to skip the initial call and only react to future changes.
 *
 * @param store - Reactive state object created with state().
 * @param key - Property key to observe.
 * @param callback - Called with new value on change (and immediately unless immediate=false).
 * @param options - Watch options
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
 * // Fires immediately with 0, then on every change
 * const unwatch = watch(store, 'count', (value) => {
 *   console.log('Count is now:', value);
 * });
 *
 * // Only fires on future changes (not the initial value)
 * watch(store, 'count', (value) => {
 *   console.log('Count changed to:', value);
 * }, { immediate: false });
 *
 * // Cleanup
 * unwatch();
 * ```
 */
export function watch<T extends object, K extends keyof T>(
  store: ReactiveState<T>,
  key: K,
  callback: Subscriber<T[K]>,
  options?: WatchOptions
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
   * Recommended for event listeners and innerHTML setup.
   * May return a cleanup function — it is called automatically when the
   * element is removed (by list update or full cleanup).
   */
  create?: (item: T, element: HTMLElement, index: number) => void | (() => void);

  /**
   * Function called on every update for data binding
   * Skipped if same item reference AND same index (optimization)
   */
  update?: (item: T, element: HTMLElement, index: number, context: UpdateContext) => void;

  /**
   * Additional cleanup when an element is removed. Called after any cleanup
   * function returned by create(). Prefer returning a cleanup from create()
   * for automatic lifecycle management.
   */
  remove?: (item: T, element: HTMLElement) => void;

  /**
   * Declarative item structure from a standard <template> element.
   * - true: use the first <template> inside the container
   * - string: CSS selector resolving to a <template>
   * - HTMLTemplateElement: use directly
   *
   * The template must contain exactly one root element. It is cloned per
   * item, and its [data-bind] paths are bound against the ITEM on every
   * update: "name" → item.name, "user.city" → item.user.city,
   * "$item" → the item itself, "$index" → current index.
   * Inputs receive .value/.checked; other elements receive textContent
   * (same semantics as bindDom's data-bind). One-way snapshot bindings.
   *
   * When set: options.element is ignored, options.render is ignored (with
   * a console warning); create/update still run on top of the bindings.
   */
  template?: true | string | HTMLTemplateElement;

  /** Element tag name or factory function (default: 'div'; ignored when template is set) */
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
 * import { createDebugPlugin, withPlugins } from 'lume-js/addons';
 *
 * const store = withPlugins(state({ count: 0 }), [
 *   createDebugPlugin({ label: 'counter' })
 * ]);
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

/**
 * Returns true if the value is a Lume reactive proxy created by state().
 * Checks the shared reactive brand symbol first (Symbol.for('lume.reactive')),
 * then falls back to duck-typing ($subscribe) for older stores.
 * This is a type guard that narrows the type to ReactiveState.
 * 
 * @param obj - Value to check
 * @returns true if obj is a ReactiveState, with type narrowing
 * 
 * @example
 * ```typescript
 * import { isReactive } from 'lume-js/addons';
 * 
 * function process(data: unknown) {
 *   if (isReactive(data)) {
 *     // data is now typed as ReactiveState<object>
 *     data.$subscribe('key', () => {});
 *   }
 * }
 * ```
 */
export function isReactive(obj: unknown): obj is ReactiveState<object>;

/**
 * Plugin interface for withPlugins().
 * All hooks are optional.
 */
export interface Plugin {
  /** Display name used in error messages */
  name?: string;
  /** Called once when withPlugins() is called */
  onInit?(): void;
  /** Intercept/transform property reads. Return a value to override, or void to pass through. */
  onGet?(key: string, value: unknown): unknown;
  /** Intercept/transform property writes. Return a value to override, or void to pass through. */
  onSet?(key: string, newValue: unknown, oldValue: unknown): unknown;
  /** Called before subscribers are notified of a change. */
  onNotify?(key: string, value: unknown): void;
  /** Called when $subscribe is invoked on the store. */
  onSubscribe?(key: string): void;
}

/**
 * Wrap a reactive state proxy with plugin hooks.
 * Plugins can intercept get/set/notify/subscribe operations.
 *
 * The returned proxy additionally exposes $dispose(), which removes the
 * plugin layer's flush hook and clears its pending notifications.
 *
 * @param store - A reactive proxy from state()
 * @param plugins - Array of plugin objects
 * @returns A new proxy wrapping the store with plugin behavior
 *
 * @example
 * ```typescript
 * import { state } from 'lume-js';
 * import { withPlugins, createDebugPlugin } from 'lume-js/addons';
 *
 * const store = withPlugins(state({ count: 0 }), [createDebugPlugin({ label: 'counter' })]);
 * store.$dispose(); // detach the plugin layer when done
 * ```
 */
export function withPlugins<T extends object>(
  store: ReactiveState<T>,
  plugins: Plugin[]
): ReactiveState<T> & { $dispose(): void };

/**
 * A group that collects cleanup/unsubscribe functions and can dispose them all at once.
 *
 * @example
 * ```typescript
 * import { createCleanupGroup } from 'lume-js/addons';
 *
 * const group = createCleanupGroup();
 * group.add(bindDom(root, store));
 * group.add(effect(() => { ... }));
 * group.add(store.$subscribe('key', fn));
 *
 * // Dispose everything at once
 * group.dispose();
 * ```
 */
export interface CleanupGroup {
  /** Add a cleanup/unsubscribe function to the group */
  add(fn: () => void): void;
  /** Run all collected cleanup functions and clear the group */
  dispose(): void;
}

/**
 * Creates a cleanup group that can collect and dispose multiple
 * cleanup/unsubscribe functions at once.
 *
 * @returns A CleanupGroup instance
 */
export function createCleanupGroup(): CleanupGroup;

/**
 * Reads initial state from a `<script type="application/json">` element
 * embedded in the server-rendered HTML.
 *
 * @param selector - CSS selector for the script element (default: '#__LUME_DATA__')
 * @param validate - Optional validator: (data) => boolean. If it returns
 *   false, hydrateState returns {} instead of the parsed data.
 * @returns Parsed JSON object, or empty object if not found, invalid, or rejected
 *
 * @example
 * ```typescript
 * import { state } from 'lume-js';
 * import { hydrateState } from 'lume-js/addons';
 *
 * const store = state(hydrateState());
 *
 * // With schema validation
 * const data = hydrateState('#__LUME_DATA__', d =>
 *   typeof (d as any).title === 'string'
 * );
 * ```
 */
export function hydrateState(selector?: string, validate?: (data: unknown) => boolean): object;

/**
 * Options for persist()
 */
export interface PersistOptions {
  /**
   * Keys to persist. Default: all own non-$ keys of the store at call time.
   * An explicit empty array is respected: persists and hydrates nothing.
   */
  keys?: string[];
  /**
   * Storage object (localStorage, sessionStorage, or any Storage-like
   * object with getItem/setItem). Default: localStorage.
   */
  storage?: Pick<Storage, 'getItem' | 'setItem'> | null;
}

/**
 * Keep selected store keys in sync with localStorage/sessionStorage:
 * hydrates them on call, then saves on change.
 *
 * - Hydration assigns stored values through the proxy (subscribers fire).
 * - Saves coalesce to one storage write per microtask and are skipped when
 *   the serialized snapshot is unchanged.
 * - Storage failures (quota, corrupted JSON, unserializable values) warn
 *   on the console — never throw.
 * - With no storage available (SSR), persistence is disabled with a warning.
 *
 * @param store - Reactive store created with state()
 * @param storageKey - The storage entry name to read/write
 * @param options - Persist options
 * @returns Dispose function — stops watching and saving
 * @throws {Error} If store is not reactive or storageKey is empty
 *
 * @example
 * ```typescript
 * import { state } from 'lume-js';
 * import { persist } from 'lume-js/addons';
 *
 * const store = state({ todos: [], filter: 'all', draft: '' });
 *
 * // Hydrate + auto-save todos/filter; draft stays in-memory only
 * const stop = persist(store, 'my-app', { keys: ['todos', 'filter'] });
 * ```
 */
export function persist(
  store: ReactiveState<any>,
  storageKey: string,
  options?: PersistOptions
): Unsubscribe;

/**
 * A single presentation entry registered with a renderQueue.
 *
 * - `el` anchors the entry to the DOM; its viewport visibility and any
 *   `[data-priority]` ancestor decide when it drains.
 * - `track` runs inside Lume's flush under a real effect() (auto-tracked):
 *   read state here, and any change re-arms the entry. It must not write DOM.
 * - `apply` runs later, from the per-frame drain, untracked: do the DOM
 *   write here, reading current state.
 * - `priority` explicitly overrides the inferred tier.
 */
export interface RenderQueueEntry {
  el: Element;
  track: () => void;
  apply: () => void;
  priority?: 'high' | 'low' | 'idle';
}

/**
 * A priority-scheduled presentation queue returned by renderQueue().
 */
export interface RenderQueue {
  /**
   * Register a presentation entry. apply() runs once synchronously now,
   * then again from the drain whenever a tracked read changes.
   *
   * @returns Dispose function — stops tracking, drops the entry, unobserves.
   */
  schedule(entry: RenderQueueEntry): Unsubscribe;
  /** Apply every dirty entry synchronously, ignoring budget and priority. */
  flush(): void;
  /** Current backlog: entries dirty and waiting to drain. */
  readonly size: number;
}

/**
 * Makes presentation updates (DOM writes that mirror state) schedulable:
 * budgeted per frame, priority-ordered, and preempted by pending input.
 * State stays fully synchronous — only the pixels are scheduled.
 *
 * @experimental The scheduling model is validated by prototype, but the API
 * surface may change before it graduates to production. State semantics are
 * never affected.
 *
 * Drain order per frame: high -> visible-auto -> low/offscreen-auto -> idle.
 * `idle` entries only run when everything else fit inside the budget.
 * Draining is FIFO within a tier, so no entry can starve.
 *
 * @param options - Queue options
 * @param options.budgetMs - Max ms of apply() work per frame. Non-positive
 *   or non-finite values fall back to the default (2).
 * @returns A queue with schedule(), flush(), and a live size.
 *
 * @example
 * ```typescript
 * import { state } from 'lume-js';
 * import { renderQueue } from 'lume-js/addons';
 *
 * const store = state({ hue: 0 });
 * const queue = renderQueue({ budgetMs: 2 });
 *
 * const stop = queue.schedule({
 *   el,
 *   track: () => store.hue,
 *   apply: () => { el.style.setProperty('--h', String(store.hue)); },
 * });
 * ```
 */
export function renderQueue(options?: { budgetMs?: number }): RenderQueue;


