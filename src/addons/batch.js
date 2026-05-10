import { setScheduler } from '../core/state.js';
import { logError } from '../utils/log.js';

let isBatching = false;
let batchQueue = new Set();

// Singleton MessageChannel for low-latency scheduling (~0.1ms vs ~4ms for setTimeout)
let _mcChannel = null;
let _mcCallbacks = [];
function scheduleViaMessageChannel(callback) {
  if (!_mcChannel) {
    _mcChannel = new MessageChannel();
    _mcChannel.port1.onmessage = () => {
      const cb = _mcCallbacks.shift();
      if (cb) cb();
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
    if (isBatching) {
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
 * @param {function} fn - The function containing state mutations
 * @param {object} [options]
 * @param {boolean} [options.dedupe=false] - Deduplicate effects across states (run once even if N states changed)
 * @param {boolean} [options.timeSlice=false] - Drain effects in non-blocking slices. Returns a Promise.
 * @param {'raf'|'message-channel'} [options.yieldVia='raf'] - Yield primitive for timeSlice mode.
 *   'raf' syncs to screen refresh (smooth animations).
 *   'message-channel' yields every ~0.1ms (maximum throughput, still non-blocking).
 * @param {'urgent'|'normal'|'background'} [options.priority] - Shorthand for common configurations:
 *   'urgent'     → dedupe:true, synchronous flush (fastest, blocks thread briefly)
 *   'normal'     → dedupe:true, timeSlice via RAF (smooth 60fps, medium throughput)
 *   'background' → dedupe:true, timeSlice via MessageChannel (smooth + maximum throughput)
 * @param {number} [options.timeBudget=4] - Max ms of effect work per yield cycle. Default 4ms.
 * @returns {*|Promise}
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

  if (typeof fn !== 'function') throw new Error('batch() requires a function');
  if (isBatching) return fn(); // nested batch: absorbed by outer

  isBatching = true;
  let result;

  try {
    result = fn();
  } finally {
    if (dedupe) {
      if (timeSlice) {
        // --- CONCURRENT MODE ---
        isBatching = false;

        return new Promise(resolve => {
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

          function processChunk() {
            const t = performance.now();
            while (idx < effectsToRun.length && (performance.now() - t) < timeBudget) {
              try { effectsToRun[idx](); }
              catch (err) { logError('[Lume.js batch] Effect error:', err); }
              idx++;
            }
            if (idx < effectsToRun.length) {
              scheduleNext(yieldVia, processChunk);
            } else {
              resolve(result);
            }
          }

          scheduleNext(yieldVia, processChunk);
        });

      } else {
        // --- SYNCHRONOUS DEDUPLICATION MODE ---
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

        if (iterations >= 100) {
          logError('[Lume.js batch] Max iterations reached — possible infinite loop in an effect.');
        }
      }
    } else {
      // --- DEFAULT MODE ---
      isBatching = false;
      for (const ctx of batchQueue) {
        try { ctx.flush(); } finally { ctx.resetScheduleFlag(); }
      }
      batchQueue.clear();
    }

    isBatching = false;
    batchQueue.clear();
  }

  return result;
}
