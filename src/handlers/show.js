/** data-show="key" → el.hidden = !Boolean(val) */
export const show = {
  attr: 'data-show',
  apply(el, val) { el.hidden = !Boolean(val); }
};
