/**
 * Create a handler for any string attribute (href, src, title, alt, action, etc.)
 * Sets the attribute value as a string. Removes the attribute when value is null/undefined.
 *
 * @param {string} name - HTML attribute name (e.g., 'href', 'src', 'title')
 * @returns {{ attr: string, apply: function }}
 */
export function stringAttr(name) {
  return {
    attr: `data-${name}`,
    apply(el, val) {
      if (val == null) el.removeAttribute(name);
      else el.setAttribute(name, String(val));
    }
  };
}
