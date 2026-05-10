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
 * @param {boolean} [options.timeSlice=false] - If true, effect execution yields to the main thread to prevent UI freezing. Requires dedupe: true.
 * @param {number} [options.timeBudget=10] - The maximum milliseconds to block the main thread per frame before yielding.
 * @returns {*} The return value of fn, or a Promise resolving to it if timeSlice is true.
 */
export function batch(fn, options = {}) {
  const dedupe = !!options.dedupe;
  const timeSlice = !!options.timeSlice;
  const timeBudget = options.timeBudget || 10;

  if (typeof fn !== 'function') {
    throw new Error('batch() requires a function');
  }

  // Handle nested batches safely (we don't time-slice inner batches)
  if (isBatching) {
    return fn();
  }

  isBatching = true;
  let result;
  
  try {
    result = fn();
  } finally {
    if (dedupe) {
      if (timeSlice) {
        // --- ASYNCHRONOUS TIME-SLICING MODE ---
        isBatching = false; // Turn off batching so we don't capture async mutations
        
        return new Promise(resolve => {
          const globalEffects = new Set();
          
          // Collect all effects immediately before any async gap
          for (const ctx of batchQueue) {
            ctx.runBeforeFlushHooks();
            ctx.notifySubscribers();
            for (const fx of ctx.pendingEffects) {
              globalEffects.add(fx);
            }
            ctx.pendingEffects.clear();
            ctx.resetScheduleFlag();
          }
          batchQueue.clear();

          const effectsToRun = Array.from(globalEffects);
          let currentIndex = 0;

          function processChunk() {
            const start = performance.now();
            
            // Run effects until we run out of effects or run out of time budget
            while (currentIndex < effectsToRun.length && (performance.now() - start < timeBudget)) {
              try { 
                effectsToRun[currentIndex](); 
              } catch (err) { 
                logError('[Lume.js batch] Error in time-sliced effect:', err); 
              }
              currentIndex++;
            }

            if (currentIndex < effectsToRun.length) {
              // We ran out of time budget, yield to browser to paint/accept input
              if (typeof requestIdleCallback === 'function') {
                requestIdleCallback(processChunk);
              } else {
                setTimeout(processChunk, 0);
              }
            } else {
              // Finished all effects
              resolve(result);
            }
          }

          // Start asynchronously
          if (typeof requestIdleCallback === 'function') {
            requestIdleCallback(processChunk);
          } else {
            setTimeout(processChunk, 0);
          }
        });
      } else {
        // --- SYNCHRONOUS DEDUPLICATION MODE ---
        let iterations = 0;
        const MAX_ITERATIONS = 100;
        const globalEffects = new Set();

        // Loop to handle cascading updates (effects mutating state)
        while (batchQueue.size > 0 && iterations < MAX_ITERATIONS) {
          iterations++;
          
          const currentQueue = Array.from(batchQueue);
          batchQueue.clear();

          for (const ctx of currentQueue) {
            ctx.runBeforeFlushHooks();
            ctx.notifySubscribers();
            
            for (const fx of ctx.pendingEffects) {
              globalEffects.add(fx);
            }
            ctx.pendingEffects.clear();
            ctx.resetScheduleFlag();
          }

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
      }
    } else {
      // --- DEFAULT MODE ---
      isBatching = false; 
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

  return result;
}
