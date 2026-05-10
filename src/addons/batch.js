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
 * @param {boolean} [options.timeSlice=false] - If true, effect execution is interleaved with the browser's
 *   paint cycle using requestAnimationFrame, preventing UI jitter. Requires dedupe: true.
 *   Returns a Promise that resolves when all effects finish.
 * @param {number} [options.timeBudget=4] - Max milliseconds of effect work per animation frame.
 *   Defaults to 4ms — a quarter of a 16.67ms frame — leaving ample time for RAF animations,
 *   layout, and paint so the UI never stutters.
 * @returns {*} The return value of fn, or a Promise resolving to it if timeSlice is true.
 */
export function batch(fn, options = {}) {
  const dedupe = !!options.dedupe;
  const timeSlice = !!options.timeSlice;
  // 4ms default: guarantees >12ms headroom per frame for animations and input
  const timeBudget = options.timeBudget != null ? options.timeBudget : 4;

  if (typeof fn !== 'function') {
    throw new Error('batch() requires a function');
  }

  // Handle nested batches safely (inner batches are absorbed by the outer one)
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
        // --- CONCURRENT MODE (TIME-SLICING) ---
        // Turn off batching flag so async mutations after yield schedule normally
        isBatching = false;

        return new Promise(resolve => {
          const globalEffects = new Set();
          
          // Drain the queue synchronously — collect every pending effect into one global Set
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
            const frameStart = performance.now();
            
            // Execute effects until we exhaust the per-frame time budget
            while (currentIndex < effectsToRun.length && (performance.now() - frameStart) < timeBudget) {
              try { 
                effectsToRun[currentIndex](); 
              } catch (err) { 
                logError('[Lume.js batch] Error in time-sliced effect:', err); 
              }
              currentIndex++;
            }

            if (currentIndex < effectsToRun.length) {
              // Yield via requestAnimationFrame — the browser will paint the current frame
              // (running RAF clock animations, processing input, etc.) BEFORE calling us back.
              // This is the key difference from setTimeout: RAF syncs to the screen refresh rate.
              requestAnimationFrame(processChunk);
            } else {
              resolve(result);
            }
          }

          // Kick off on the next animation frame so the browser paints BEFORE we start working
          requestAnimationFrame(processChunk);
        });

      } else {
        // --- SYNCHRONOUS DEDUPLICATION MODE ---
        let iterations = 0;
        const MAX_ITERATIONS = 100;
        const globalEffects = new Set();

        // Loop to handle cascading updates (effects that mutate state)
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
      // Must be false so cascading updates within ctx.flush() schedule normally
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
    
    // Safety fallback: always clear state even if an exception escaped
    isBatching = false;
    batchQueue.clear();
  }

  return result;
}
