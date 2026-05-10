import { setScheduler } from '../core/state.js';

let isBatching = false;
let batchQueue = new Set(); // Use Set to deduplicate states if mutated multiple times

// We need to keep a reference to whatever scheduler was active before
// However, since state.js doesn't export a `getScheduler`, we assume queueMicrotask 
// is the default, or we can just run them synchronously for the batch.
// Actually, `batch()` is supposed to suppress microtasks and flush synchronously at the end.

setScheduler({
  schedule: (stateContext) => {
    if (isBatching) {
      batchQueue.add(stateContext);
    } else {
      // Default behavior if not batching: each state gets its own microtask
      queueMicrotask(() => {
        try { stateContext.flush(); } 
        finally { stateContext.resetScheduleFlag(); }
      });
    }
  }
});

/**
 * Suppress microtask flushes during a group of writes, then flush synchronously once.
 * Note: If multiple states are mutated, their effects are NOT deduplicated across states.
 * This maintains Lume-JS's per-state isolation design while providing synchronous DOM updates.
 *
 * @param {function} fn - The function containing state mutations
 */
export function batch(fn) {
  if (typeof fn !== 'function') {
    throw new Error('batch() requires a function');
  }

  // Handle nested batches safely
  if (isBatching) {
    return fn();
  }

  isBatching = true;
  try {
    return fn();
  } finally {
    isBatching = false;
    
    // Flush all queued states synchronously
    // Iterate over the Set and flush each
    for (const ctx of batchQueue) {
      try {
        ctx.flush();
      } finally {
        ctx.resetScheduleFlag();
      }
    }
    batchQueue.clear();
  }
}
