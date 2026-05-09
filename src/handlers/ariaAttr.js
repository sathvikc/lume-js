/**
 * Create a handler for an ARIA attribute.
 * Coerces value to "true"/"false" string — use stringAttr("aria-X") for token/string ARIA attrs.
 *
 * @param {string} name - ARIA name, with or without "aria-" prefix
 * @returns {{ attr: string, apply: function }}
 */
export function ariaAttr(name) {
  const fullName = name.startsWith('aria-') ? name : `aria-${name}`;
  return {
    attr: `data-${fullName}`,
    apply(el, val) { el.setAttribute(fullName, val ? 'true' : 'false'); }
  };
}
