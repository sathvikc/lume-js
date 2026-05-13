/**
 * Reads initial state from a `<script type="application/json">` element
 * embedded in the server-rendered HTML. Useful for SSR / hydration patterns.
 *
 * @security Hydration trusts the DOM. An attacker who can inject HTML before
 * the legitimate script (DOM clobbering) can control the parsed data. The
 * element must be a real `<script type="application/json">` tag; non-script
 * elements are rejected. Use the optional `validate` parameter to enforce a
 * schema (e.g., whitelist allowed keys) before passing to `state()`.
 *
 * @param {string} [selector='#__LUME_DATA__'] - CSS selector for the script element
 * @param {function} [validate] - Optional validator: (data) => boolean. If it
 *   returns false, hydrateState returns {} instead of the parsed data.
 * @returns {object} Parsed JSON object, or empty object if not found / invalid / rejected
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
 * // With optional schema validation
 * const data = hydrateState('#__LUME_DATA__', d =>
 *   typeof d.title === 'string' && typeof d.count === 'number'
 * );
 * const store = state(data);
 * ```
 */
export function hydrateState(selector = '#__LUME_DATA__', validate) {
  const el = typeof document !== 'undefined' ? document.querySelector(selector) : null;
  if (!el) return {};

  // Reject non-script elements or scripts without the correct type.
  // This mitigates DOM clobbering where an attacker injects a matching
  // element with a different tag name (e.g., a div or a script with
  // a different type that would still match querySelector by id).
  if (el.tagName !== 'SCRIPT' || el.type !== 'application/json') {
    return {};
  }

  let data;
  try {
    data = JSON.parse(el.textContent);
  } catch {
    return {};
  }

  if (typeof validate === 'function' && !validate(data)) {
    return {};
  }

  return data;
}
