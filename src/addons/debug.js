/**
 * Lume-JS Debug Addon
 * 
 * Developer-friendly logging and inspection of reactive state operations.
 * Critical for adoption - hard to debug = hard to adopt.
 * 
 * Usage:
 *   import { createDebugPlugin, debug } from "lume-js/addons";
 *   
 *   const store = state({ count: 0 }, { 
 *     plugins: [createDebugPlugin({ label: 'myStore' })] 
 *   });
 *   
 *   debug.enable();  // Enable logging
 *   debug.filter('count');  // Only log 'count' key
 *   debug.stats();  // Show statistics
 * 
 * @module addons/debug
 */

// Global debug state
let globalEnabled = true;
let globalFilter = null; // string, RegExp, or null
const stats = new Map(); // label -> { gets: Map, sets: Map, notifies: Map }

/**
 * Check if a key matches the current filter
 * @param {string} key
 * @returns {boolean}
 */
function matchesFilter(key) {
  if (globalFilter === null) return true;
  if (typeof globalFilter === 'string') {
    return key.includes(globalFilter);
  }
  if (globalFilter instanceof RegExp) {
    return globalFilter.test(key);
  }
  return true;
}

/**
 * Get or create stats entry for a label
 * @param {string} label
 * @returns {object}
 */
function getStats(label) {
  if (!stats.has(label)) {
    stats.set(label, {
      gets: new Map(),
      sets: new Map(),
      notifies: new Map()
    });
  }
  return stats.get(label);
}

/**
 * Increment a stat counter
 * @param {string} label
 * @param {'gets'|'sets'|'notifies'} type
 * @param {string} key
 */
function incrementStat(label, type, key) {
  const s = getStats(label);
  const map = s[type];
  map.set(key, (map.get(key) || 0) + 1);
}

/**
 * Format value for logging (truncate long values)
 * @param {any} value
 * @returns {string}
 */
function formatValue(value) {
  try {
    const json = JSON.stringify(value);
    if (json && json.length > 100) {
      return json.slice(0, 97) + '...';
    }
    return json;
  } catch {
    return String(value);
  }
}

/**
 * Create a debug plugin instance for a reactive state store.
 * 
 * @param {object} [options] - Configuration options
 * @param {string} [options.label='store'] - Label for log messages
 * @param {boolean} [options.logGet=false] - Log property reads (can be noisy)
 * @param {boolean} [options.logSet=true] - Log property writes
 * @param {boolean} [options.logNotify=true] - Log subscriber notifications
 * @param {boolean} [options.trace=false] - Show stack trace for SET operations
 * @returns {object} Plugin object for state()
 * 
 * @example
 * const store = state({ count: 0 }, { 
 *   plugins: [createDebugPlugin({ label: 'counter' })] 
 * });
 * 
 * @example
 * // With stack traces for debugging where state changes originate
 * const store = state({ count: 0 }, { 
 *   plugins: [createDebugPlugin({ label: 'counter', trace: true })] 
 * });
 */
export function createDebugPlugin(options = {}) {
  const label = options.label ?? 'store';

  // IMPORTANT: Do NOT destructure options here!
  // Options may contain getters for dynamic runtime toggling (e.g., from UI).
  // Destructuring would copy values once at creation time, breaking reactivity.
  // Use getOpt() helper to read options dynamically in each hook.
  const getOpt = (name, defaultVal) => {
    const val = options[name];
    return val !== undefined ? val : defaultVal;
  };

  return {
    name: `debug:${label}`,

    onInit: () => {
      if (globalEnabled) {
        console.log(`%c[${label}]%c initialized`, 'color: #888; font-weight: bold', 'color: inherit');
      }
    },

    onGet: (key, value) => {
      // Skip internal properties
      if (typeof key === 'string' && key.startsWith('$')) {
        return value;
      }

      incrementStat(label, 'gets', key);

      if (globalEnabled && getOpt('logGet', false) && matchesFilter(key)) {
        console.log(
          `%c[${label}]%c GET %c${key}%c = ${formatValue(value)}`,
          'color: #888; font-weight: bold',
          'color: #4CAF50',
          'color: #2196F3; font-weight: bold',
          'color: inherit'
        );
      }

      return value;
    },

    onSet: (key, newValue, oldValue) => {
      // Skip internal properties
      if (typeof key === 'string' && key.startsWith('$')) {
        return newValue;
      }

      incrementStat(label, 'sets', key);

      if (globalEnabled && getOpt('logSet', true) && matchesFilter(key)) {
        console.log(
          `%c[${label}]%c SET %c${key}%c: ${formatValue(oldValue)} → ${formatValue(newValue)}`,
          'color: #888; font-weight: bold',
          'color: #FF9800',
          'color: #2196F3; font-weight: bold',
          'color: inherit'
        );

        // Show stack trace if enabled (helps find where state changes originate)
        if (getOpt('trace', false)) {
          console.trace(`%c[${label}] Stack trace for ${key}`, 'color: #888');
        }
      }

      return newValue;
    },

    onSubscribe: (key) => {
      if (globalEnabled && matchesFilter(key)) {
        console.log(
          `%c[${label}]%c SUBSCRIBE %c${key}`,
          'color: #888; font-weight: bold',
          'color: #9C27B0',
          'color: #2196F3; font-weight: bold'
        );
      }
    },

    onNotify: (key, value) => {
      // Skip internal properties
      if (typeof key === 'string' && key.startsWith('$')) {
        return;
      }

      incrementStat(label, 'notifies', key);

      if (globalEnabled && getOpt('logNotify', true) && matchesFilter(key)) {
        console.log(
          `%c[${label}]%c NOTIFY %c${key}%c = ${formatValue(value)}`,
          'color: #888; font-weight: bold',
          'color: #E91E63',
          'color: #2196F3; font-weight: bold',
          'color: inherit'
        );
      }
    }
  };
}

/**
 * Global debug controls
 */
export const debug = {
  /**
   * Enable debug logging globally
   */
  enable() {
    globalEnabled = true;
    console.log('%c[lume-debug]%c Logging enabled', 'color: #888; font-weight: bold', 'color: #4CAF50');
  },

  /**
   * Disable debug logging globally
   */
  disable() {
    globalEnabled = false;
    console.log('%c[lume-debug]%c Logging disabled', 'color: #888; font-weight: bold', 'color: #F44336');
  },

  /**
   * Check if debug logging is currently enabled
   * @returns {boolean}
   */
  isEnabled() {
    return globalEnabled;
  },

  /**
   * Filter logs by key pattern
   * @param {string|RegExp|null} pattern - Pattern to match, or null to clear filter
   */
  filter(pattern) {
    globalFilter = pattern;
    if (pattern === null) {
      console.log('%c[lume-debug]%c Filter cleared', 'color: #888; font-weight: bold', 'color: inherit');
    } else {
      console.log(`%c[lume-debug]%c Filter set: ${pattern}`, 'color: #888; font-weight: bold', 'color: inherit');
    }
  },

  /**
   * Get current filter pattern
   * @returns {string|RegExp|null}
   */
  getFilter() {
    return globalFilter;
  },

  /**
   * Get statistics data (silent - no console output)
   * Use logStats() if you want to see stats in console.
   * @returns {object} Stats object for programmatic access
   */
  stats() {
    const result = {};

    for (const [label, data] of stats) {
      result[label] = {
        gets: Object.fromEntries(data.gets),
        sets: Object.fromEntries(data.sets),
        notifies: Object.fromEntries(data.notifies)
      };
    }

    return result;
  },

  /**
   * Log statistics summary to console (with formatting)
   * @returns {object} Stats object for programmatic access
   */
  logStats() {
    const result = this.stats();

    if (Object.keys(result).length === 0) {
      console.log('%c[lume-debug]%c No stats collected yet', 'color: #888; font-weight: bold', 'color: inherit');
      return result;
    }

    console.group('%c[lume-debug] Statistics', 'color: #888; font-weight: bold');

    for (const [label, data] of Object.entries(result)) {
      console.group(`%c${label}`, 'color: #2196F3; font-weight: bold');

      // Use console.table for better formatted output
      const tableData = [];
      const allKeys = new Set([
        ...Object.keys(data.gets),
        ...Object.keys(data.sets),
        ...Object.keys(data.notifies)
      ]);

      for (const key of allKeys) {
        tableData.push({
          key,
          gets: data.gets[key] || 0,
          sets: data.sets[key] || 0,
          notifies: data.notifies[key] || 0
        });
      }

      if (tableData.length > 0) {
        console.table(tableData);
      }

      console.groupEnd();
    }

    console.groupEnd();

    return result;
  },

  /**
   * Reset all collected statistics
   */
  resetStats() {
    stats.clear();
    console.log('%c[lume-debug]%c Stats reset', 'color: #888; font-weight: bold', 'color: inherit');
  }
};
