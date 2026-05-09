/**
 * Create handlers for CSS class toggling.
 * Each name creates a handler: data-class-{name}="key" → el.classList.toggle(name, Boolean(val))
 * Returns an array — pass directly to handlers (auto-flattened by bindDom).
 *
 * @param {...string} names - CSS class names to create handlers for
 * @returns {Array<{ attr: string, apply: function }>}
 */
export function classToggle(...names) {
  return names.map(name => ({
    attr: `data-class-${name}`,
    apply(el, val) { el.classList.toggle(name, Boolean(val)); }
  }));
}
