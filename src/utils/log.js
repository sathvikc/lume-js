/**
 * Environment-safe logging utilities for constrained runtimes
 * (e.g. service workers, embedded engines, SSR environments).
 *
 * All core and addon files should import these instead of
 * calling console.* directly to avoid ReferenceError when
 * console is not defined.
 */

export function logWarn(msg, ...rest) {
  if (typeof console !== 'undefined' && typeof console.warn === 'function') {
    console.warn(msg, ...rest);
  }
}

export function logError(msg, ...rest) {
  if (typeof console !== 'undefined' && typeof console.error === 'function') {
    console.error(msg, ...rest);
  }
}
