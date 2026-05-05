/**
 * Reads initial state from a `<script type="application/json">` element
 * embedded in the server-rendered HTML. Useful for SSR / hydration patterns.
 *
 * @param {string} [selector='#__LUME_DATA__'] - CSS selector for the script element
 * @returns {object} Parsed JSON object, or empty object if not found / invalid
 *
 * @example
 * ```html
 * <script id="__LUME_DATA__" type="application/json">
 *   {"title": "Welcome", "count": 42}
 * </script>
 * ```
 *
 * ```js
 * import { state } from 'lume-js';
 * import { hydrateState } from 'lume-js/addons';
 *
 * const store = state(hydrateState());
 * ```
 */
export function hydrateState(selector = '#__LUME_DATA__') {
  const el = typeof document !== 'undefined' ? document.querySelector(selector) : null;
  if (!el) return {};
  try {
    return JSON.parse(el.textContent);
  } catch {
    return {};
  }
}
