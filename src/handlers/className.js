/** data-classname="key" → el.className = val || '' */
export const className = {
  attr: 'data-classname',
  apply(el, val) { el.className = val || ''; }
};
