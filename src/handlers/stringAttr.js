/**
 * Create a handler for any string attribute (href, src, title, alt, action, etc.)
 * Sets the attribute value as a string. Removes the attribute when value is null/undefined.
 *
 * @param {string} name - HTML attribute name (e.g., 'href', 'src', 'title')
 * @returns {{ attr: string, apply: function }}
 */

const DANGEROUS_SCHEME = /^(javascript|vbscript|data\s*:\s*text\/html)/i;
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
      if (URI_ATTRS.has(name) && DANGEROUS_SCHEME.test(strVal)) {
        el.removeAttribute(name);
        return;
      }
      el.setAttribute(name, strVal);
    }
  };
}
