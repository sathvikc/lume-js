import { state, bindDom, effect } from 'lume-js';
import { watch }                   from 'lume-js/addons';
import { classToggle, show, stringAttr } from 'lume-js/handlers';

import { createRouter, link }            from './lume-router.js';
import { renderHome }                    from './pages/home.js';
import { renderExamples }                from './pages/examples.js';
import { renderCompare, renderNotFound } from './pages/compare.js';
import { renderDocs, wireTOC, fetchDoc, DOCS_SITEMAP } from './pages/docs.js';

/* =========================================================================
   MARKED INIT — configure syntax highlighting on the global marked instance
   ========================================================================= */
if (typeof marked !== 'undefined') {
  marked.setOptions({
    gfm: true,
    breaks: false,
    highlight(code, lang) {
      if (window.hljs) {
        if (lang && hljs.getLanguage(lang)) {
          return hljs.highlight(code, { language: lang }).value;
        }
        return hljs.highlightAuto(code).value;
      }
      return code;
    }
  });
}

/* =========================================================================
   THEME REGISTRY
   ========================================================================= */
const THEMES = [
  { id: 'light', label: 'Light',     hint: 'Paper',       swatches: ['#fafaf7','#ffffff','#b8541f','#18181b'] },
  { id: 'dark',  label: 'Dark',      hint: 'Default',     swatches: ['#0b0b0c','#151517','#f5c54a','#f3f1ea'] },
  { id: 'dim',   label: 'Dim',       hint: 'Tokyo Night', swatches: ['#1a1b26','#1f2030','#7aa2f7','#c0caf5'] },
  { id: 'solar', label: 'Solarized', hint: 'Warm',        swatches: ['#fdf6e3','#fffaf0','#b8541f','#3a2f1b'] },
];
const THEME_IDS = THEMES.map(t => t.id);
const prefersLight = matchMedia('(prefers-color-scheme: light)').matches;
const saved = localStorage.getItem('lume.theme');
const initialTheme = THEME_IDS.includes(saved) ? saved : (prefersLight ? 'light' : 'dark');

/* =========================================================================
   APP STORE
   ========================================================================= */
const store = state({
  theme: initialTheme,
  themeMenuOpen: false,
  verMenuOpen: false,
  route: { page: 'home', slug: null, params: {} },
  year: new Date().getFullYear(),
  clock: '',
});
window.store = store;

/* =========================================================================
   DEMO STORE (home page hero only)
   ========================================================================= */
const demoStore = state({ name: 'friend', count: 0, isEven: true, parity: 'even' });
window.demoStore = demoStore;
watch(demoStore, 'count', (n) => {
  demoStore.isEven = n % 2 === 0;
  demoStore.parity = demoStore.isEven ? 'even' : 'odd';
});

/* =========================================================================
   ROUTER
   ========================================================================= */
const router = createRouter(store, 'route', {
  '/'            : ()       => ({ page: 'home',     slug: null }),
  '/docs'        : ()       => ({ page: 'docs',     slug: 'introduction' }),
  '/docs/:slug'  : (params) => ({ page: 'docs',     slug: params.slug }),
  '/examples'    : ()       => ({ page: 'examples', slug: null }),
  '/compare'     : ()       => ({ page: 'compare',  slug: null }),
});
window.router = router;

/* =========================================================================
   PAGE RENDERING
   ========================================================================= */
const outlet = document.getElementById('outlet');
let currentCleanup = null;

watch(store, 'route', async (r) => {
  const current = outlet.firstElementChild;
  if (current) current.classList.add('is-leaving');

  // Fetch doc and run animation in parallel — MD files are small, fetch wins
  const [docHtml] = await Promise.all([
    r.page === 'docs' ? fetchDoc(r.slug || 'introduction') : Promise.resolve(null),
    new Promise(res => setTimeout(res, 120)),
  ]);

  if (currentCleanup) { currentCleanup(); currentCleanup = null; }

  let html;
  if (r.page === 'docs') {
    html = renderDocs(r.slug || 'introduction', docHtml);
  } else {
    html = renderPage(r);
  }

  outlet.innerHTML = `<div class="page">${html}</div>`;

  mountPage(r);

  currentCleanup = bindDom(outlet, store, {
    handlers: [show, classToggle('active'), stringAttr('href'), link(router)]
  });

  syncNav(r);
  window.scrollTo({ top: 0, behavior: 'instant' });

  if (window.hljs) outlet.querySelectorAll('pre code').forEach(b => hljs.highlightElement(b));

  if (r.page === 'docs') wireTOC();
}, { immediate: true });

function renderPage(r) {
  switch (r.page) {
    case 'home':     return renderHome();
    case 'examples': return renderExamples();
    case 'compare':  return renderCompare();
    default:         return renderNotFound();
  }
}

function mountPage(r) {
  if (r.page === 'home') {
    const demoRoot = document.getElementById('demo-root');
    if (demoRoot) {
      const cleanup = bindDom(demoRoot, demoStore, { handlers: [classToggle('is-even'), show] });
      const snap = { count: demoStore.count, parity: demoStore.parity, isEven: demoStore.isEven, name: demoStore.name };
      Object.assign(demoStore, { count: null, parity: null, isEven: null, name: '' });
      Object.assign(demoStore, snap);
      const prev = currentCleanup;
      currentCleanup = () => { cleanup(); if (prev) prev(); };
    }
  }
}

function syncNav(r) {
  document.querySelectorAll('#primary-nav a').forEach(a => {
    a.classList.toggle('active', a.dataset.route === r.page);
  });
}

/* =========================================================================
   THEME SYSTEM
   ========================================================================= */
function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  const isLight = (theme === 'light' || theme === 'solar');
  const light = document.getElementById('hljs-light');
  const dark  = document.getElementById('hljs-dark');
  if (light) light.disabled = !isLight;
  if (dark)  dark.disabled  =  isLight;
  document.querySelectorAll('.theme-option[data-theme-id]').forEach(btn => {
    btn.classList.toggle('is-current', btn.dataset.themeId === theme);
  });
}

const optsEl = document.getElementById('theme-options');
if (optsEl) {
  optsEl.innerHTML = THEMES.map(t => `
    <button class="theme-option flex items-center gap-2.5 w-full px-2.5 py-2 border-0 bg-transparent text-fg text-left font-inherit text-[13px] rounded-md cursor-pointer hover:bg-bg-sunken" role="menuitemradio" data-theme-id="${t.id}">
      <span class="flex gap-1">${t.swatches.map(c => `<span class="w-3.5 h-3.5 rounded-[4px] shadow-[inset_0_0_0_1px_rgba(0,0,0,.12)]" style="background:${c}"></span>`).join('')}</span>
      <span>
        <div>${t.label}</div>
        <div class="text-[11px] text-fg-subtle font-mono">${t.hint}</div>
      </span>
      <svg class="check ml-auto" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
    </button>
  `).join('');
  optsEl.querySelectorAll('[data-theme-id]').forEach(btn => {
    btn.addEventListener('click', () => { store.theme = btn.dataset.themeId; store.themeMenuOpen = false; });
  });
}

window.resetTheme = () => {
  localStorage.removeItem('lume.theme');
  store.theme = matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  store.themeMenuOpen = false;
};

document.addEventListener('click', (e) => {
  if (!store.themeMenuOpen) return;
  if (e.target.closest('.theme-picker')) return;
  store.themeMenuOpen = false;
});
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { store.themeMenuOpen = false; store.verMenuOpen = false; } });

watch(store, 'theme', (theme) => { applyTheme(theme); localStorage.setItem('lume.theme', theme); });

watch(store, 'verMenuOpen', (open) => {
  const m = document.getElementById('ver-menu');
  if (!m) return;
  m.inert = !open;
  m.style.opacity = open ? '1' : '0';
  m.style.transform = open ? 'translateY(0)' : 'translateY(-4px)';
  m.style.pointerEvents = open ? 'auto' : 'none';
});
document.addEventListener('click', (e) => {
  if (!store.verMenuOpen) return;
  if (e.target.closest('#ver-btn') || e.target.closest('#ver-menu')) return;
  store.verMenuOpen = false;
});

watch(store, 'themeMenuOpen', (open) => {
  const menu = document.getElementById('theme-menu');
  if (!menu) return;
  menu.inert = !open;
  menu.classList.toggle('is-open', open);
});

/* =========================================================================
   CLOCK
   ========================================================================= */
const tickClock = () => {
  store.clock = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
};
tickClock();
setInterval(tickClock, 1000);

/* =========================================================================
   GLOBAL BINDINGS (header / footer)
   ========================================================================= */
bindDom(document.querySelector('.site-header'), store, { handlers: [link(router)] });
bindDom(document.querySelector('.site-footer'), store, { handlers: [link(router)] });

applyTheme(store.theme);

/* =========================================================================
   REACTIVE TITLE
   ========================================================================= */
effect(() => {
  const r = store.route;
  const docMeta = r.page === 'docs'
    ? DOCS_SITEMAP.find(d => d.slug === (r.slug || 'introduction'))
    : null;
  document.title = docMeta
    ? `${docMeta.title} · Lume.js`
    : r.page === 'home'
      ? 'Lume.js — Reactivity that follows web standards'
      : `${r.page[0].toUpperCase() + r.page.slice(1)} · Lume.js`;
});
