/**
 * Lume-JS Persist Addon
 *
 * Keeps selected store keys in sync with localStorage/sessionStorage (or
 * any Storage-like object): hydrates them on call, then saves on change.
 *
 * Usage:
 *   import { state } from "lume-js";
 *   import { persist } from "lume-js/addons";
 *
 *   const store = state({ todos: [], filter: 'all', draft: '' });
 *
 *   // Hydrate + auto-save todos/filter; draft stays in-memory only
 *   const stop = persist(store, 'my-app', { keys: ['todos', 'filter'] });
 *
 * Behavior:
 * - Hydration assigns stored values through the proxy, so subscribers and
 *   bindings see them like any other write.
 * - Saves are coalesced to one storage write per microtask, and skipped
 *   entirely when the serialized snapshot is unchanged.
 * - Storage failures (quota, unavailable, corrupted JSON, unserializable
 *   values) are contained: a console warning, never a throw.
 *
 * @security Storage is same-origin but survives schema changes — hydration
 * only assigns keys you watch (never unknown keys from storage), and the
 * core set trap independently blocks prototype-polluting keys.
 *
 * @module addons/persist
 */

import { logWarn } from '../utils/log.js';

/**
 * Read and parse the stored JSON blob. Returns a plain object, or null
 * when missing, corrupted, or not an object (warns on read errors).
 */
function readStored(storage, storageKey) {
  try {
    const raw = storage.getItem(storageKey);
    if (!raw) return null;
    const data = JSON.parse(raw);
    return data && typeof data === 'object' && !Array.isArray(data) ? data : null;
  } catch {
    logWarn(`[Lume.js] persist(): could not read "${storageKey}" — starting fresh`);
    return null;
  }
}

/** Serialize the watched subset of the store. May throw (circular refs). */
function serializeKeys(store, watched) {
  const out = {};
  for (const k of watched) out[k] = store[k];
  return JSON.stringify(out);
}

/**
 * Default storage resolution. Wrapped because accessing localStorage can
 * THROW (SecurityError) in cookie-blocked iframes and some privacy modes —
 * persist() must degrade to a warning, never crash the app at setup.
 */
function defaultStorage() {
  try {
    return typeof localStorage !== 'undefined' ? localStorage : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Sync store keys with a Storage object.
 *
 * @param {object} store - Reactive store created with state()
 * @param {string} storageKey - The storage entry name to read/write
 * @param {object} [options]
 * @param {string[]} [options.keys] - Keys to persist. Default: all own
 *   non-$ keys of the store at call time.
 * @param {Storage} [options.storage] - Storage object. Default: localStorage.
 *   Pass sessionStorage for per-tab persistence.
 * @returns {function} Dispose function — stops watching and saving.
 */
export function persist(store, storageKey, options = {}) {
  if (!store || typeof store.$subscribe !== 'function') {
    throw new Error('[Lume.js] persist() requires a reactive store from state()');
  }
  if (typeof storageKey !== 'string' || storageKey.length === 0) {
    throw new Error('[Lume.js] persist() requires a non-empty storage key');
  }

  const storage = options.storage !== undefined
    ? options.storage
    : defaultStorage();

  if (!storage || typeof storage.getItem !== 'function') {
    logWarn('[Lume.js] persist(): no storage available — persistence disabled');
    return () => {};
  }

  const watched = Array.isArray(options.keys) && options.keys.length > 0
    ? options.keys.slice()
    : Object.keys(store).filter(k => !k.startsWith('$'));

  // ── Hydrate ────────────────────────────────────────────────────────────
  // Only watched keys are assigned — stale storage can't inject others.
  const stored = readStored(storage, storageKey);
  if (stored) {
    for (const k of watched) {
      if (Object.prototype.hasOwnProperty.call(stored, k)) {
        store[k] = stored[k];
      }
    }
  }

  // ── Save on change ─────────────────────────────────────────────────────
  // Remember what storage holds (post-hydration) so unchanged flushes —
  // including the hydration echo itself — skip the write.
  let lastWritten = null;
  try {
    lastWritten = serializeKeys(store, watched);
  } catch {
    // Unserializable initial state: first save attempt will warn.
  }

  let scheduled = false;
  let disposed = false;

  const flushSave = () => {
    scheduled = false;
    if (disposed) return;

    let json;
    try {
      json = serializeKeys(store, watched);
    } catch (err) {
      logWarn('[Lume.js] persist(): state not serializable — skipping save', err);
      return;
    }
    if (json === lastWritten) return;

    try {
      storage.setItem(storageKey, json);
      lastWritten = json;
    } catch (err) {
      logWarn('[Lume.js] persist(): could not write — storage full or unavailable?', err);
    }
  };

  const save = () => {
    if (scheduled) return;
    scheduled = true;
    queueMicrotask(flushSave);
  };

  const unsubs = watched.map(k => {
    let first = true;
    return store.$subscribe(k, () => {
      if (first) { first = false; return; } // skip $subscribe's immediate call
      save();
    });
  });

  return () => {
    disposed = true;
    while (unsubs.length) unsubs.pop()();
  };
}
