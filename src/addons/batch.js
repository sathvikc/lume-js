import { setScheduler } from '../core/state.js';

import { logError } from '../utils/log.js';

let isBatching = false;
let batchQueue = new Set(); // Use Set to deduplicate states if mutated multiple times

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
 * 
 * @param {function} fn - The function containing state mutations
 * @param {object} [options] - Configuration options
 * @param {boolean} [options.dedupe=false] - If true, effects reading multiple mutated states run exactly once.
 */
export function batch(fn, options = { dedupe: false }) {
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
    if (options.dedupe) {
      let iterations = 0;
      const MAX_ITERATIONS = 100;
      const globalEffects = new Set();

      // Loop to handle cascading updates (effects mutating state)
      while (batchQueue.size > 0 && iterations < MAX_ITERATIONS) {
        iterations++;
        
        // Take a snapshot and clear so new mutations add to the next iteration
        const currentQueue = Array.from(batchQueue);
        batchQueue.clear();

        // 1. Run hooks and notify subscribers for all states in this iteration
        for (const ctx of currentQueue) {
          ctx.runBeforeFlushHooks();
          ctx.notifySubscribers();
          
          // Collect all effects into a single global Set for deduplication
          for (const fx of ctx.pendingEffects) {
            globalEffects.add(fx);
          }
          ctx.pendingEffects.clear();
          ctx.resetScheduleFlag();
        }

        // 2. Run deduplicated effects
        // Take a snapshot of effects because running them might trigger new effects
        const effectsToRun = Array.from(globalEffects);
        globalEffects.clear();

        for (const fx of effectsToRun) {
          try { fx(); } catch (err) { logError('[Lume.js batch] Error in effect:', err); }
        }
      }

      if (iterations >= MAX_ITERATIONS) {
        logError(
          '[Lume.js batch] Maximum global batch iterations reached (100). ' +
          'This usually indicates an infinite loop caused by an effect or computed mutating state it depends on.'
        );
      }
    } else {
      // Flush all queued states synchronously, preserving per-state isolation
      isBatching = false; // Must be false so cascading updates within ctx.flush() schedule normally
      for (const ctx of batchQueue) {
        try {
          ctx.flush();
        } finally {
          ctx.resetScheduleFlag();
        }
      }
      batchQueue.clear();
    }
    
    // Safety fallback
    isBatching = false;
    batchQueue.clear();
  }
}
