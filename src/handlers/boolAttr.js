/**
 * Create a handler for any HTML boolean attribute.
 * Uses toggleAttribute() — works correctly with any attribute name
 * (readonly, contenteditable, etc.) without worrying about camelCase property names.
 *
 * @param {string} name - Attribute name (e.g., 'readonly', 'open', 'contenteditable')
 * @returns {{ attr: string, apply: function }}
 */
export function boolAttr(name) {
  return {
    attr: `data-${name}`,
    apply(el, val) { el.toggleAttribute(name, Boolean(val)); }
  };
}
