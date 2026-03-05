/**
 * Lume-JS DOM Binding Handlers
 *
 * Extend bindDom() with additional reactive data-* attribute capabilities.
 * Each handler is a plain object — no framework API, no registration.
 *
 * Usage:
 *   import { state, bindDom } from 'lume-js';
 *   import { show, classToggle } from 'lume-js/handlers';
 *
 *   const store = state({ isVisible: true, isActive: false });
 *   bindDom(document.body, store, { handlers: [show, classToggle('active')] });
 *
 * Custom handlers:
 *   const tooltip = { attr: 'data-tooltip', apply(el, val) { el.title = val ?? ''; } };
 *   bindDom(root, store, { handlers: [tooltip] });
 *
 * Handler contract:
 *   { attr: string, apply(el: HTMLElement, val: any): void }
 */

// --- Ready-to-use Handlers ---

/**
 * data-show="key" → el.hidden = !Boolean(val)
 * Shows element when state value is truthy (inverse of built-in data-hidden).
 */
export const show = {
  attr: 'data-show',
  apply(el, val) { el.hidden = !Boolean(val); }
};

// --- Factory Functions ---

/**
 * Create a handler for any HTML boolean attribute.
 * Uses toggleAttribute() — works correctly with any attribute name
 * (readonly, contenteditable, etc.) without worrying about camelCase property names.
 *
 * Note: built-in boolean handlers (hidden, disabled, checked, required) use
 * property assignment directly. This factory uses toggleAttribute for broader
 * attribute name compatibility.
 *
 * @param {string} name - Attribute name (e.g., 'readonly', 'open', 'contenteditable')
 * @returns {{ attr: string, apply: function }}
 *
 * @example
 * bindDom(root, store, { handlers: [boolAttr('readonly')] });
 * // <input data-readonly="isReadonly" />
 */
export function boolAttr(name) {
  return {
    attr: `data-${name}`,
    apply(el, val) { el.toggleAttribute(name, Boolean(val)); }
  };
}

/**
 * Create a handler for an ARIA attribute.
 * Use for ARIA attrs beyond the built-in aria-expanded/aria-hidden.
 *
 * @param {string} name - ARIA name, with or without "aria-" prefix
 * @returns {{ attr: string, apply: function }}
 *
 * @example
 * bindDom(root, store, { handlers: [ariaAttr('pressed'), ariaAttr('selected')] });
 * // <button data-aria-pressed="isPressed">Toggle</button>
 */
export function ariaAttr(name) {
  const fullName = name.startsWith('aria-') ? name : `aria-${name}`;
  return {
    attr: `data-${fullName}`,
    apply(el, val) { el.setAttribute(fullName, val ? 'true' : 'false'); }
  };
}

/**
 * Create handlers for CSS class toggling.
 * Each name creates a handler: data-class-{name}="key" → el.classList.toggle(name, Boolean(val))
 *
 * Returns an array — pass directly to handlers (auto-flattened by bindDom).
 *
 * @param {...string} names - CSS class names to create handlers for
 * @returns {Array<{ attr: string, apply: function }>}
 *
 * @example
 * bindDom(root, store, { handlers: [classToggle('active', 'loading', 'error')] });
 * // <div data-class-active="isActive" data-class-loading="isLoading">
 */
export function classToggle(...names) {
  return names.map(name => ({
    attr: `data-class-${name}`,
    apply(el, val) { el.classList.toggle(name, Boolean(val)); }
  }));
}

/**
 * Create a handler for any string attribute (href, src, title, alt, action, etc.)
 * Sets the attribute value as a string. Removes attribute when value is null/undefined.
 *
 * @param {string} name - HTML attribute name (e.g., 'href', 'src', 'title')
 * @returns {{ attr: string, apply: function }}
 *
 * @example
 * bindDom(root, store, { handlers: [stringAttr('href'), stringAttr('src')] });
 * // <a data-href="profileUrl">Profile</a>
 * // <img data-src="imageUrl" />
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

// --- Presets ---

/** Form-related handlers (beyond built-in disabled/checked/required) */
export const formHandlers = [
  boolAttr('readonly'),
];

/** Additional ARIA handlers (beyond built-in aria-expanded/aria-hidden) */
export const a11yHandlers = [
  ariaAttr('pressed'),
  ariaAttr('selected'),
  ariaAttr('disabled'),
];

// --- htmlAttrs() — All Standard HTML Attributes ---

/**
 * Standard HTML boolean attributes (beyond built-in hidden/disabled/checked/required).
 * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Attributes#boolean_attributes
 */
const BOOL_ATTRS = [
  'readonly', 'open', 'novalidate', 'formnovalidate', 'multiple',
  'autofocus', 'autoplay', 'controls', 'loop', 'muted', 'defer',
  'async', 'reversed', 'selected', 'inert', 'allowfullscreen',
];

/**
 * Standard HTML string attributes.
 * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Attributes
 */
const STRING_ATTRS = [
  'href', 'src', 'alt', 'title', 'placeholder', 'action', 'method',
  'target', 'rel', 'type', 'name', 'role', 'lang', 'tabindex',
  'pattern', 'min', 'max', 'step', 'minlength', 'maxlength',
  'width', 'height', 'for', 'form', 'accept', 'autocomplete',
  'loading', 'decoding', 'inputmode', 'enterkeyhint', 'draggable',
  'contenteditable', 'spellcheck', 'translate', 'dir', 'id',
  'poster', 'preload', 'download', 'media', 'sizes', 'srcset',
  'colspan', 'rowspan', 'scope', 'headers', 'wrap', 'sandbox',
];

/**
 * ARIA boolean state attributes — toggled between "true" and "false".
 * Use ariaAttr() for these (coerces to "true"/"false" string).
 * @see https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Attributes
 */
const ARIA_BOOL_ATTRS = [
  'pressed', 'selected', 'disabled', 'checked', 'invalid', 'required',
  'busy', 'modal', 'multiselectable', 'multiline', 'readonly', 'atomic',
];

/**
 * ARIA string/token/numeric attributes — value passed through as-is.
 * Use stringAttr() with "aria-" prefix for these.
 * @see https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Attributes
 */
const ARIA_STRING_ATTRS = [
  'current', 'live', 'relevant', 'haspopup',
  'sort', 'autocomplete', 'orientation',
  'label', 'describedby', 'labelledby', 'controls', 'owns',
  'activedescendant', 'errormessage', 'details', 'flowto',
  'valuenow', 'valuemin', 'valuemax', 'valuetext',
  'colcount', 'colindex', 'colspan', 'rowcount', 'rowindex', 'rowspan',
  'level', 'setsize', 'posinset', 'placeholder', 'roledescription',
  'keyshortcuts', 'braillelabel', 'brailleroledescription',
];

/**
 * One-import preset that enables all standard HTML attributes as reactive handlers.
 *
 * Includes:
 * - Boolean attributes: readonly, open, autofocus, controls, muted, inert, etc.
 * - String attributes: href, src, alt, title, placeholder, role, tabindex, etc.
 * - ARIA attributes: aria-pressed, aria-label, aria-describedby, aria-valuenow, etc.
 * - Show handler: data-show (inverse of data-hidden)
 *
 * Returns a flat array — pass directly to handlers option.
 *
 * @returns {Array<{ attr: string, apply: function }>}
 *
 * @example
 * import { htmlAttrs } from 'lume-js/handlers';
 *
 * bindDom(document.body, store, { handlers: [htmlAttrs()] });
 * // Now use any data-* attribute:
 * //   <a data-href="url">Link</a>
 * //   <input data-readonly="isLocked" />
 * //   <div data-aria-label="labelText">...</div>
 * //   <div data-show="isVisible">...</div>
 */
export function htmlAttrs() {
  return [
    show,
    ...BOOL_ATTRS.map(name => boolAttr(name)),
    ...STRING_ATTRS.map(name => stringAttr(name)),
    ...ARIA_BOOL_ATTRS.map(name => ariaAttr(name)),
    ...ARIA_STRING_ATTRS.map(name => stringAttr(`aria-${name}`)),
  ];
}
