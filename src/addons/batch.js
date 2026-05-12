import { setScheduler } from '../core/state.js';
import { logError, logWarn } from '../utils/log.js';

let isBatching = false;
let isTimeSlicing = false; // BUG-2 fix: separate flag for async effect-drain phase
let batchQueue = new Set();

// Singleton MessageChannel for low-latency scheduling (~0.1ms vs ~4ms for setTimeout)
// Review confirmed: 1:1 postMessage→onmessage, FIFO ordering guaranteed, singleton is safe.
let _mcChannel = null;
let _mcCallbacks = [];
function scheduleViaMessageChannel(callback) {
  if (!_mcChannel) {
    _mcChannel = new MessageChannel();
    _mcChannel.port1.onmessage = () => {
      const cb = _mcCallbacks.shift();
      if (cb) {
        // Wrap in try/catch so a thrown error doesn't kill the channel for future messages
        try { cb(); } catch (err) { logError('[Lume.js batch] MessageChannel callback error:', err); }
      }
    };
  }
  _mcCallbacks.push(callback);
  _mcChannel.port2.postMessage(null);
}

function scheduleNext(via, callback) {
  if (via === 'message-channel') {
    scheduleViaMessageChannel(callback);
  } else {
    // RAF syncs to screen refresh — effects paint in the same frame as the clock
    requestAnimationFrame(callback);
  }
}

setScheduler({
  schedule: (stateContext) => {
    if (isBatching || isTimeSlicing) {
      // BUG-2 fix: also capture mutations that happen during async effect processing.
      // Without isTimeSlicing, mutations from effects would bypass the batch and
      // create a microtask race, potentially causing double effect execution.
      batchQueue.add(stateContext);
    } else {
      queueMicrotask(() => {
        try { stateContext.flush(); }
        finally { stateContext.resetScheduleFlag(); }
      });
    }
  }
});

/**
 * Suppress microtask flushes during a group of writes, then flush once.
 *
 * @param {function} fn - The function containing state mutations.
 *   IMPORTANT: `fn` must be synchronous. Async callbacks are not supported —
 *   mutations inside an `await` happen after batch() has already processed the queue.
 * @param {object} [options]
 * @param {boolean} [options.dedupe=false] - Deduplicate effects across states (run once even if N states changed)
 * @param {boolean} [options.timeSlice=false] - Drain effects in non-blocking slices. Returns a Promise.
 * @param {'raf'|'message-channel'} [options.yieldVia='raf'] - Yield primitive for timeSlice mode.
 *   'raf' syncs to screen refresh (smooth animations, medium throughput).
 *   'message-channel' yields every ~0.1ms (maximum throughput, still non-blocking).
 * @param {'urgent'|'normal'|'background'} [options.priority] - Shorthand for common configurations:
 *   'urgent'     → dedupe:true, synchronous flush (fastest, blocks thread briefly)
 *   'normal'     → dedupe:true, timeSlice via RAF (smooth 60fps, medium throughput)
 *   'background' → dedupe:true, timeSlice via MessageChannel (smooth + maximum throughput)
 * @param {number} [options.timeBudget=4] - Max ms of effect work per yield cycle. Default 4ms
 *   (a quarter of a 16.67ms frame), leaving headroom for animations and input.
 * @param {AbortSignal} [options.signal] - Optional AbortSignal. If aborted while effects are
 *   draining, the time-sliced batch stops immediately and resolves (does not reject).
 *   Use with AbortController to cancel stale background work when the component unmounts
 *   or the dataset is replaced.
 * @returns {*} Return value of fn() for sync modes, or Promise<return value of fn()> for timeSlice mode.
 */
export function batch(fn, options = {}) {
  // Resolve priority shorthand into low-level options
  let dedupe = !!options.dedupe;
  let timeSlice = !!options.timeSlice;
  let yieldVia = options.yieldVia || 'raf';

  if (options.priority === 'urgent') {
    dedupe = true; timeSlice = false;
  } else if (options.priority === 'normal') {
    dedupe = true; timeSlice = true; yieldVia = 'raf';
  } else if (options.priority === 'background') {
    dedupe = true; timeSlice = true; yieldVia = 'message-channel';
  }

  const timeBudget = options.timeBudget != null ? options.timeBudget : 4;
  const signal = options.signal instanceof AbortSignal ? options.signal : null;

  if (typeof fn !== 'function') throw new Error('batch() requires a function');

  // Nested batch: absorbed by the outer batch's queue
  if (isBatching) return fn();

  // ── Run fn() ──────────────────────────────────────────────────────────────
  // BUG-1 fix: use separate try/catch instead of try/finally so that:
  //   1. Errors from fn() are always visible (not swallowed by `return` in finally)
  //   2. For timeSlice mode, we can reject the Promise with the real error
  //   3. Control flow is explicit and easy to reason about
  isBatching = true;
  let result;
  let fnError;

  try {
    result = fn();
    // Warn if fn returned a Promise — async callbacks are not supported
    if (result && typeof result.then === 'function') {
      logWarn('[Lume.js batch] batch() callback returned a Promise. Only synchronous mutations are captured. Mutations inside `await` will bypass the batch.');
    }
  } catch (e) {
    fnError = e;
  }

  isBatching = false;

  // If fn() threw, clean up and propagate the error correctly.
  // The test suite expects that mutations made BEFORE the throw still flush
  // (partial mutations are committed, then error propagates).
  if (fnError) {
    // Still flush whatever was queued before the throw
    if (batchQueue.size > 0) {
      isBatching = true; // keep flag up during flush
      const q = Array.from(batchQueue);
      batchQueue.clear();
      for (const ctx of q) {
        try { ctx.flush(); } finally { ctx.resetScheduleFlag(); }
      }
    }
    isBatching = false;
    batchQueue.clear();
    if (timeSlice) return Promise.reject(fnError);
    throw fnError;
  }

  // ── Flush the queue ───────────────────────────────────────────────────────
  if (dedupe) {
    if (timeSlice) {
      // --- CONCURRENT MODE ---
      // Collect all pending effects from the batch queue into a global deduplicated Set.
      // This must happen synchronously before the first yield so we don't miss any effects.
      const globalEffects = new Set();
      for (const ctx of batchQueue) {
        ctx.runBeforeFlushHooks();
        ctx.notifySubscribers();
        for (const fx of ctx.pendingEffects) globalEffects.add(fx);
        ctx.pendingEffects.clear();
        ctx.resetScheduleFlag();
      }
      batchQueue.clear();

      const effectsToRun = Array.from(globalEffects);
      let idx = 0;

      // Zero effects: resolve immediately without an async hop
      if (effectsToRun.length === 0) return Promise.resolve(result);

      return new Promise(resolve => {
        function processChunk() {
          // EDGE-3 fix: honour AbortSignal cancellation.
          // Stale batches (e.g. from a previous initDemo call) stop here instead of
          // writing to DOM nodes that have already been removed.
          if (signal?.aborted) { isTimeSlicing = false; resolve(result); return; }

          isTimeSlicing = true; // BUG-2: capture any state mutations from effects into batchQueue

          const t = performance.now();
          while (idx < effectsToRun.length && (performance.now() - t) < timeBudget) {
            try { effectsToRun[idx](); }
            catch (err) { logError('[Lume.js batch] Effect error:', err); }
            idx++;
          }

          if (idx < effectsToRun.length) {
            // More effects to run — yield to browser then resume
            isTimeSlicing = false;
            scheduleNext(yieldVia, processChunk);
          } else {
            // All primary effects done.
            // BUG-2 fix: flush any secondary mutations that effects triggered during processing.
            // These were captured in batchQueue via the isTimeSlicing flag.
            isTimeSlicing = false;
            if (batchQueue.size > 0) {
              const secondary = new Set();
              for (const ctx of batchQueue) {
                ctx.runBeforeFlushHooks();
                ctx.notifySubscribers();
                for (const fx of ctx.pendingEffects) secondary.add(fx);
                ctx.pendingEffects.clear();
                ctx.resetScheduleFlag();
              }
              batchQueue.clear();
              for (const fx of secondary) {
                try { fx(); } catch (err) { logError('[Lume.js batch] Secondary effect error:', err); }
              }
            }
            resolve(result);
          }
        }

        scheduleNext(yieldVia, processChunk);
      });

    } else {
      // --- SYNCHRONOUS DEDUPLICATION MODE ---
      // Keep isBatching=true during the flush so that any effect that mutates state
      // re-enters batchQueue and gets picked up by the next while-loop iteration
      // (this is how cascading updates like effect → state++ → re-run work correctly).
      isBatching = true;
      let iterations = 0;
      const globalEffects = new Set();

      while (batchQueue.size > 0 && iterations < 100) {
        iterations++;
        const q = Array.from(batchQueue);
        batchQueue.clear();

        for (const ctx of q) {
          ctx.runBeforeFlushHooks();
          ctx.notifySubscribers();
          for (const fx of ctx.pendingEffects) globalEffects.add(fx);
          ctx.pendingEffects.clear();
          ctx.resetScheduleFlag();
        }

        const toRun = Array.from(globalEffects);
        globalEffects.clear();
        for (const fx of toRun) {
          try { fx(); } catch (err) { logError('[Lume.js batch] Effect error:', err); }
        }
      }

      isBatching = false;

      if (iterations >= 100) {
        logError('[Lume.js batch] Max iterations reached — possible infinite loop in an effect.');
      }
    }
  } else {
    // --- DEFAULT MODE ---
    for (const ctx of batchQueue) {
      try { ctx.flush(); } finally { ctx.resetScheduleFlag(); }
    }
    batchQueue.clear();
  }

  return result;
}
