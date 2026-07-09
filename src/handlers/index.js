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

export { show }                    from './show.js';
export { className }               from './className.js';
export { boolAttr }                from './boolAttr.js';
export { ariaAttr }                from './ariaAttr.js';
export { classToggle }             from './classToggle.js';
export { stringAttr }              from './stringAttr.js';
export { on }                      from './on.js';
export { htmlAttrs }               from './htmlAttrs.js';
export { formHandlers, a11yHandlers } from './presets.js';
