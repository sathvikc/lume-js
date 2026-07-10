/**
 * Create a handler for any string attribute (href, src, title, alt, action, etc.)
 * Sets the attribute value as a string. Removes the attribute when value is null/undefined.
 *
 * @param {string} name - HTML attribute name (e.g., 'href', 'src', 'title')
 * @returns {{ attr: string, apply: function }}
 */

// Matched against a normalized copy of the value (C0 controls, space, and
// DEL stripped; lowercased) because the browser URL parser ignores those
// characters when determining the scheme — "java\tscript:alert(1)" and
// " javascript:alert(1)" both execute. The colon is required so legitimate
// relative URLs like "javascript-tutorial.html" are not blocked.
const DANGEROUS_SCHEME = /^(?:javascript:|vbscript:|data:text\/html)/;
const IGNORED_URL_CHARS = /[\u0000-\u0020\u007F]/g;
const URI_ATTRS = new Set(['href', 'src', 'action', 'srcset', 'poster', 'formaction']);

export function stringAttr(name) {
  return {
    attr: `data-${name}`,
    apply(el, val) {
      if (val == null) {
        el.removeAttribute(name);
        return;
      }
      const strVal = String(val);
      if (URI_ATTRS.has(name) &&
          DANGEROUS_SCHEME.test(strVal.replace(IGNORED_URL_CHARS, '').toLowerCase())) {
        el.removeAttribute(name);
        return;
      }
      el.setAttribute(name, strVal);
    }
  };
}
