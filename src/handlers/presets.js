import { boolAttr } from './boolAttr.js';
import { ariaAttr } from './ariaAttr.js';

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
