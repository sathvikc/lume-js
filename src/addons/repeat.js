/**
 * Lume-JS List Rendering (Addon)
 *
 * Renders lists with automatic subscription and element reuse by key.
 * 
 * Core guarantees:
 * Element reuse by key (same DOM nodes, not recreated)
 * Minimal DOM operations (only updates what changed)
 * Memory efficiency (cleanup on remove)
 * 
 * Default behavior (can be disabled/customized):
 * ✅ Focus preservation (maintains activeElement and selection)
 * ✅ Scroll preservation (intelligent positioning for add/remove/reorder)
 * 
 * Philosophy: No artificial limitations
 * - All preservation logic is overridable via options
 * - Set to null/false to disable, or provide custom functions
 * - Export utilities so you can wrap/extend them
 *
 * ⚠️ IMPORTANT: Arrays must be updated immutably!
 * store.items.push(x)      // ❌ Won't trigger update
 * store.items = [...items] // ✅ Triggers update
 * 
 * ═══════════════════════════════════════════════════════════════════════
 * PATTERN 1: Simple (render only) - for simple cases or backward compat
 * ═══════════════════════════════════════════════════════════════════════
 * 
 *   repeat('#list', store, 'todos', {
 *     key: todo => todo.id,
 *     render: (todo, el) => {
 *       el.textContent = todo.name;  // Called on every update
 *     }
 *   });
 *
 * ═══════════════════════════════════════════════════════════════════════
 * PATTERN 2: Clean separation (create + update) - recommended
 * ═══════════════════════════════════════════════════════════════════════
 *
 *   repeat('#list', store, 'todos', {
 *     key: todo => todo.id,
 *     create: (todo, el) => {
 *       // Called ONCE when element is created - build DOM structure
 *       const nameSpan = document.createElement('span');
 *       nameSpan.className = 'name';
 *       el.appendChild(nameSpan);
 *       const btn = document.createElement('button');
 *       btn.textContent = 'Delete';
 *       btn.onclick = () => deleteTodo(todo.id);
 *       el.appendChild(btn);
 *
 *       // Return a cleanup function — called automatically when element is removed
 *       return () => {
 *         // Unsubscribe from external listeners, remove timers, etc.
 *       };
 *     },
 *     update: (todo, el, index, { isFirstRender }) => {
 *       // Called on every update - bind data
 *       // isFirstRender = true on initial render, false on subsequent
 *       // Skipped if same object reference (optimization)
 *       el.querySelector('.name').textContent = todo.name;
 *     }
 *   });
 *
 * ═══════════════════════════════════════════════════════════════════════
 * ADVANCED: Custom preservation strategies
 * ═══════════════════════════════════════════════════════════════════════
 * 
 *   import { defaultFocusPreservation, defaultScrollPreservation } from "lume-js/addons";
 *   
 *   repeat('#list', store, 'items', {
 *     key: item => item.id,
 *     create: (item, el) => { ... },
 *     update: (item, el) => { ... },
 *     preserveFocus: null, // disable focus preservation
 *     preserveScroll: (container, context) => {
 *       const restore = defaultScrollPreservation(container, context);
 *       return () => { restore(); console.log('Scroll restored!'); };
 *     }
 *   });
 */
import { logWarn, logError } from '../utils/log.js';

/**
 * Default focus preservation strategy
 * Saves activeElement and selection state before DOM updates
 * 
 * @param {HTMLElement} container - The list container
 * @returns {Function|null} Restore function, or null if nothing to restore
 */
export function defaultFocusPreservation(container) {
  const activeEl = document.activeElement;
  const shouldRestore = container.contains(activeEl);

  if (!shouldRestore) return null;

  let selectionStart = null;
  let selectionEnd = null;

  if (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA') {
    selectionStart = activeEl.selectionStart;
    selectionEnd = activeEl.selectionEnd;
  }

  return () => {
    if (document.body.contains(activeEl)) {
      activeEl.focus();
      if (selectionStart !== null && selectionEnd !== null) {
        activeEl.setSelectionRange(selectionStart, selectionEnd);
      }
    }
  };
}

/**
 * Default scroll preservation strategy
 * Uses anchor-based preservation for add/remove, pixel position for reorder
 * 
 * @param {HTMLElement} container - The list container
 * @param {Object} context - Additional context
 * @param {boolean} context.isReorder - Whether this is a reorder operation
 * @returns {Function} Restore function
 */
export function defaultScrollPreservation(container, context = {}) {
  const { isReorder = false } = context;
  const scrollTop = container.scrollTop;

  // Early return if no scroll
  if (scrollTop === 0) {
    return () => { container.scrollTop = 0; };
  }

  let anchorElement = null;
  let anchorOffset = 0;

  // Only use anchor-based preservation for add/remove, not reorder
  if (!isReorder) {
    const containerRect = container.getBoundingClientRect();
    // Avoid Array.from - iterate children directly
    for (let child = container.firstElementChild; child; child = child.nextElementSibling) {
      const rect = child.getBoundingClientRect();

      if (rect.bottom > containerRect.top) {
        anchorElement = child;
        anchorOffset = rect.top - containerRect.top;
        break;
      }
    }
  }

  return () => {
    if (anchorElement && document.body.contains(anchorElement)) {
      const newRect = anchorElement.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();
      const currentOffset = newRect.top - containerRect.top;
      const scrollAdjustment = currentOffset - anchorOffset;

      container.scrollTop = container.scrollTop + scrollAdjustment;
    } else {
      container.scrollTop = scrollTop;
    }
  };
}

/**
 * Efficiently render a list with element reuse
 * 
 * @param {string|HTMLElement} container - Container element or selector
 * @param {Object} store - Reactive state object
 * @param {string} arrayKey - Key in store containing the array
 * @param {Object} options - Configuration
 * @param {Function} options.key - Function to extract unique key: (item) => key
 * @param {Function} [options.render] - Function to render item (called for all items): (item, element, index) => void
 * @param {Function} [options.create] - Function for new elements only: (item, element, index) => void | Function. If a function is returned, it is registered as the element's cleanup and called automatically when the element is removed (by list update or full cleanup).
 * @param {Function} [options.update] - Function for data binding: (item, element, index, { isFirstRender }) => void. Skipped if same item reference AND same index.
 * @param {Function} [options.remove] - Additional cleanup when element is removed: (item, element) => void. Called after any cleanup function returned by create(). Optional — prefer returning a cleanup from create() for automatic lifecycle management.
 * @param {string|Function} [options.element='div'] - Element tag name or factory function
 * @param {Function|null} [options.preserveFocus=defaultFocusPreservation] - Focus preservation strategy (null to disable)
 * @param {Function|null} [options.preserveScroll=defaultScrollPreservation] - Scroll preservation strategy (null to disable)
 * @returns {Function} Cleanup function
 */

export function repeat(container, store, arrayKey, options) {
  const {
    key,
    render,
    create,
    update,
    remove,
    element = 'div',
    preserveFocus = defaultFocusPreservation,
    preserveScroll = defaultScrollPreservation
  } = options;

  // Resolve container
  const containerEl =
    typeof container === 'string'
      ? document.querySelector(container)
      : container;

  if (!containerEl) {
    logWarn(`[Lume.js] repeat(): container "${container}" not found`);
    return () => { };
  }

  if (typeof key !== 'function') {
    throw new Error('[Lume.js] repeat(): options.key must be a function');
  }

  if (typeof render !== 'function' && typeof create !== 'function') {
    throw new Error('[Lume.js] repeat(): options.render or options.create must be a function');
  }

  // key -> HTMLElement
  const elementsByKey = new Map();
  // key -> previous item (for reference comparison)
  const prevItemsByKey = new Map();
  // key -> previous index (for reorder detection)
  const prevIndexByKey = new Map();
  // key -> cleanup function returned by create()
  const cleanupByKey = new Map();
  const seenKeys = new Set();

  function createElement() {
    return typeof element === 'function'
      ? element()
      : document.createElement(element);
  }

  function reconcileDOM(container, nextEls) {
    let ptr = container.firstChild;

    for (let i = 0; i < nextEls.length; i++) {
      const desired = nextEls[i];

      if (ptr === desired) {
        ptr = ptr.nextSibling;
        continue;
      }

      container.insertBefore(desired, ptr);
    }

    // Remove leftover children not in nextEls
    while (ptr) {
      const next = ptr.nextSibling;
      container.removeChild(ptr);
      ptr = next;
    }
  }

  function applyPreservation(container, fn, isReorder) {
    const shouldPreserve = document.body.contains(container);
    const restoreFocus = shouldPreserve && preserveFocus ? preserveFocus(container) : null;
    const restoreScroll = shouldPreserve && preserveScroll ? preserveScroll(container, { isReorder }) : null;

    fn();

    if (restoreFocus) restoreFocus();
    if (restoreScroll) restoreScroll();
  }

  // eslint-disable-next-line sonarjs/cognitive-complexity -- keyed DOM reconciliation: create/reuse/remove nodes, key dedup, scroll/focus preservation
  function updateList() {
    const items = store[arrayKey];

    if (!Array.isArray(items)) {
      logWarn(`[Lume.js] repeat(): store.${arrayKey} is not an array`);
      return;
    }

    // Only compute isReorder if scroll preservation needs it.
    // Uses elementsByKey (previous state) and items directly — no Set allocations.
    let isReorder = false;
    if (preserveScroll && elementsByKey.size === items.length) {
      isReorder = true;
      for (let i = 0; i < items.length; i++) {
        if (!elementsByKey.has(key(items[i]))) { isReorder = false; break; }
      }
    }

    seenKeys.clear();
    const nextEls = [];

    // Build ordered list of DOM nodes (created or reused)
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const k = key(item);

      if (seenKeys.has(k)) {
        logWarn(`[Lume.js] repeat(): duplicate key "${k}"`);
        continue;
      }
      seenKeys.add(k);

      let el = elementsByKey.get(k);
      const isFirstRender = !el;

      if (isFirstRender) {
        el = createElement();
        elementsByKey.set(k, el);
      }

      try {
        // Call create for new elements (DOM structure)
        if (isFirstRender && create) {
          const cleanup = create(item, el, i);
          if (typeof cleanup === 'function') {
            cleanupByKey.set(k, cleanup);
          }
        }

        // Call update for data binding (new and existing elements)
        // Skip if same item reference AND same index (optimization)
        const prevItem = prevItemsByKey.get(k);
        const prevIndex = prevIndexByKey.get(k);
        if (update) {
          if (prevItem !== item || prevIndex !== i) {
            update(item, el, i, { isFirstRender });
          }
        } else if (render) {
          // Backward compatibility: render handles both create and update
          render(item, el, i);
        }

        // Store reference and index for next comparison
        prevItemsByKey.set(k, item);
        prevIndexByKey.set(k, i);

      } catch (err) {
        logError(`[Lume.js] repeat(): error rendering key "${k}":`, err);
      }

      nextEls.push(el);
    }

    // eslint-disable-next-line sonarjs/cognitive-complexity -- DOM cleanup pass: remove stale nodes, call per-item cleanup callbacks, update maps
    applyPreservation(containerEl, () => {
      reconcileDOM(containerEl, nextEls);

      // Clean maps: remove keys not in seenKeys (new state)
      if (elementsByKey.size !== seenKeys.size) {
        for (const k of elementsByKey.keys()) {
          if (!seenKeys.has(k)) {
            const el = elementsByKey.get(k);
            const prevItem = prevItemsByKey.get(k);
            // Call create-returned cleanup first, then remove callback
            const cleanup = cleanupByKey.get(k);
            if (typeof cleanup === 'function') {
              try {
                cleanup();
              } catch (err) {
                logError(`[Lume.js] repeat(): cleanup error for key "${k}":`, err);
              }
            }
            if (typeof remove === 'function' && el) {
              remove(prevItem, el);
            }
            elementsByKey.delete(k);
            prevItemsByKey.delete(k);
            prevIndexByKey.delete(k);
            cleanupByKey.delete(k);
          }
        }
      }
    }, isReorder);
  }

  // Subscription — $subscribe calls updateList immediately (initial render),
  // so no separate updateList() call is needed for reactive stores.
  let unsubscribe;
  if (typeof store.$subscribe === 'function') {
    unsubscribe = store.$subscribe(arrayKey, updateList);
  } else if (typeof store.subscribe === 'function') {
    // Generic subscribe (e.g. computed) — subscribe first, then initial render
    const subResult = store.subscribe(() => updateList());
    updateList();
    // Normalize both function-style and object-style (RxJS Subscription) returns
    unsubscribe = typeof subResult === 'function'
      ? subResult
      : () => { subResult?.unsubscribe?.(); };
  } else {
    // Non-reactive store — render once and return cleanup
    updateList();
    logWarn('[Lume.js] repeat(): store is not reactive (no $subscribe or subscribe method)');
    return () => {
      for (const [k, el] of elementsByKey) {
        const prevItem = prevItemsByKey.get(k);
        const cleanup = cleanupByKey.get(k);
        if (typeof cleanup === 'function') {
          try {
            cleanup();
          } catch (err) {
            logError(`[Lume.js] repeat(): cleanup error for key "${k}":`, err);
          }
        }
        if (typeof remove === 'function') {
          remove(prevItem, el);
        }
      }
      containerEl.replaceChildren();
      elementsByKey.clear();
      prevItemsByKey.clear();
      prevIndexByKey.clear();
      cleanupByKey.clear();
      seenKeys.clear();
    };
  }

  return () => {
    if (typeof unsubscribe === 'function') {
      unsubscribe();
    }
    // Invoke cleanup and remove callback for all remaining elements before clearing
    for (const [k, el] of elementsByKey) {
      const prevItem = prevItemsByKey.get(k);
      const cleanup = cleanupByKey.get(k);
      if (typeof cleanup === 'function') {
        try {
          cleanup();
        } catch (err) {
          logError(`[Lume.js] repeat(): cleanup error for key "${k}":`, err);
        }
      }
      if (typeof remove === 'function') {
        remove(prevItem, el);
      }
    }
    // Clear DOM elements (replaceChildren is faster than loop)
    containerEl.replaceChildren();
    elementsByKey.clear();
    prevItemsByKey.clear();
    prevIndexByKey.clear();
    cleanupByKey.clear();
    seenKeys.clear();
  };
}
