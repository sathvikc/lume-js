import { state, bindDom, effect } from 'lume-js';
import {
  show,
  classToggle,
  boolAttr,
  ariaAttr,
  stringAttr,
  formHandlers,
  a11yHandlers,
} from 'lume-js/handlers';

// ============================================================================
// STATE
// ============================================================================

const store = state({
  // show handler
  showMessage: true,

  // classToggle handler
  isActive: false,
  isHighlighted: false,
  isSelected: false,

  // boolAttr handler
  isReadonly: false,

  // ariaAttr handler
  isPressed: false,
  isSelected2: false,

  // stringAttr handler
  linkUrl: 'https://github.com/sathvikc/lume-js',
  linkTitle: 'Lume.js on GitHub',

  // custom handler
  tooltipText: 'Hello from Lume.js!',
});

// ============================================================================
// BUTTON ACTIONS — wired via data-action attributes (no inline onclick)
// ============================================================================

const actions = {
  toggleShow:      () => { store.showMessage = !store.showMessage; },
  toggleActive:    () => { store.isActive = !store.isActive; },
  toggleHighlight: () => { store.isHighlighted = !store.isHighlighted; },
  toggleSelected:  () => { store.isSelected = !store.isSelected; },
  toggleReadonly:   () => { store.isReadonly = !store.isReadonly; },
  togglePressed:   () => { store.isPressed = !store.isPressed; },
  toggleSelected2: () => { store.isSelected2 = !store.isSelected2; },
};

document.body.addEventListener('click', (e) => {
  const action = e.target.closest('[data-action]')?.dataset.action;
  if (action && actions[action]) actions[action]();
});

// ============================================================================
// CUSTOM HANDLER
// ============================================================================

const tooltip = {
  attr: 'data-tooltip',
  apply(el, val) { el.title = val ?? ''; }
};

// ============================================================================
// BIND DOM — All handlers registered in one call
// ============================================================================

const cleanup = bindDom(document.body, store, {
  handlers: [
    show,
    classToggle('active', 'highlight', 'selected'),
    boolAttr('readonly'),
    ariaAttr('pressed'),
    ariaAttr('selected'),
    stringAttr('href'),
    stringAttr('title'),
    tooltip,
  ]
});

// ============================================================================
// STATUS DOTS — Reactive indicators via effect()
// ============================================================================

const dotMap = {
  'show-dot': () => store.showMessage,
  'active-dot': () => store.isActive,
  'highlight-dot': () => store.isHighlighted,
  'selected-dot': () => store.isSelected,
  'readonly-dot': () => store.isReadonly,
  'pressed-dot': () => store.isPressed,
  'aria-selected-dot': () => store.isSelected2,
};

// One effect per dot for fine-grained updates
for (const [id, getter] of Object.entries(dotMap)) {
  effect(() => {
    const el = document.getElementById(id);
    if (el) {
      const val = getter();
      el.classList.toggle('on', Boolean(val));
      el.classList.toggle('off', !Boolean(val));
    }
  });
}
