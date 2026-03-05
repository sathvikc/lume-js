/**
 * Lume.js Handlers TypeScript Definitions
 *
 * Extend bindDom() with additional reactive data-* attribute capabilities.
 * Import from "lume-js/handlers" for tree-shaking.
 */

/**
 * Handler interface for reactive data-* attribute binding.
 * Pass to bindDom() options.handlers to add new reactive attributes.
 *
 * @example
 * ```typescript
 * const tooltip: Handler = {
 *   attr: 'data-tooltip',
 *   apply(el, val) { el.title = val ?? ''; }
 * };
 * bindDom(root, store, { handlers: [tooltip] });
 * ```
 */
export interface Handler {
  /** Data attribute name (e.g., 'data-show', 'data-class-active') */
  readonly attr: string;
  /** Apply the reactive value to the element */
  apply(el: HTMLElement, val: any): void;
}

/**
 * data-show="key" → Shows element when truthy (el.hidden = !val)
 * Inverse of built-in data-hidden.
 */
export const show: Handler;

/**
 * Create a handler for any HTML boolean property.
 * Use for properties beyond the built-in hidden/disabled/checked/required.
 *
 * @param name - Property name (e.g., 'readonly', 'open')
 *
 * @example
 * ```typescript
 * bindDom(root, store, { handlers: [boolAttr('readonly')] });
 * // <input data-readonly="isReadonly" />
 * ```
 */
export function boolAttr(name: string): Handler;

/**
 * Create a handler for an ARIA attribute.
 * Use for ARIA attrs beyond the built-in aria-expanded/aria-hidden.
 *
 * @param name - ARIA name, with or without "aria-" prefix
 *
 * @example
 * ```typescript
 * bindDom(root, store, { handlers: [ariaAttr('pressed')] });
 * // <button data-aria-pressed="isPressed">Toggle</button>
 * ```
 */
export function ariaAttr(name: string): Handler;

/**
 * Create handlers for CSS class toggling.
 * Each name creates a handler: data-class-{name}="key" → el.classList.toggle(name, Boolean(val))
 *
 * Returns an array — pass directly to handlers (auto-flattened by bindDom).
 *
 * @param names - CSS class names to create handlers for
 *
 * @example
 * ```typescript
 * bindDom(root, store, { handlers: [classToggle('active', 'loading')] });
 * // <div data-class-active="isActive" data-class-loading="isLoading">
 * ```
 */
export function classToggle(...names: string[]): Handler[];

/**
 * Create a handler for any string attribute (href, src, title, alt, etc.)
 * Sets the attribute value as a string. Removes attribute when null/undefined.
 *
 * @param name - HTML attribute name (e.g., 'href', 'src', 'title')
 *
 * @example
 * ```typescript
 * bindDom(root, store, { handlers: [stringAttr('href')] });
 * // <a data-href="profileUrl">Profile</a>
 * ```
 */
export function stringAttr(name: string): Handler;

/** Form-related handlers preset (readonly) */
export const formHandlers: Handler[];

/** Additional ARIA handlers preset (pressed, selected, disabled) */
export const a11yHandlers: Handler[];

/**
 * One-import preset that enables all standard HTML attributes as reactive handlers.
 *
 * Includes:
 * - Boolean attributes: readonly, open, autofocus, controls, muted, inert, etc.
 * - String attributes: href, src, alt, title, placeholder, role, tabindex, etc.
 * - ARIA attributes: aria-pressed, aria-label, aria-describedby, aria-valuenow, etc.
 * - Show handler: data-show (inverse of data-hidden)
 *
 * @returns Flat array of handlers — pass directly to bindDom options.
 *
 * @example
 * ```typescript
 * import { htmlAttrs } from 'lume-js/handlers';
 *
 * bindDom(document.body, store, { handlers: [htmlAttrs()] });
 * // <a data-href="url">Link</a>
 * // <input data-readonly="isLocked" />
 * // <div data-aria-label="labelText">...</div>
 * ```
 */
export function htmlAttrs(): Handler[];
