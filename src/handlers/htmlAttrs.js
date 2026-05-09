import { show }       from './show.js';
import { boolAttr }   from './boolAttr.js';
import { ariaAttr }   from './ariaAttr.js';
import { stringAttr } from './stringAttr.js';

/** @see https://developer.mozilla.org/en-US/docs/Web/HTML/Attributes#boolean_attributes */
const BOOL_ATTRS = [
  'readonly', 'open', 'novalidate', 'formnovalidate', 'multiple',
  'autofocus', 'autoplay', 'controls', 'loop', 'muted', 'defer',
  'async', 'reversed', 'selected', 'inert', 'allowfullscreen',
];

/** @see https://developer.mozilla.org/en-US/docs/Web/HTML/Attributes */
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

/** ARIA boolean state attributes — coerced to "true"/"false" string. */
const ARIA_BOOL_ATTRS = [
  'pressed', 'selected', 'disabled', 'checked', 'invalid', 'required',
  'busy', 'modal', 'multiselectable', 'multiline', 'readonly', 'atomic',
];

/** ARIA string/token/numeric attributes — value passed through as-is. */
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
 * Returns a flat array — pass directly to handlers option.
 *
 * @returns {Array<{ attr: string, apply: function }>}
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
