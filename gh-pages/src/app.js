import { state, bindDom, effect } from 'lume-js';
import { watch } from 'lume-js/addons';
import { classToggle, show, stringAttr } from 'lume-js/handlers';

import { createRouter, link } from './lume-router.js';
import { renderHome } from './pages/home.js';
import { renderExamples } from './pages/examples.js';
import { renderCompare, renderNotFound } from './pages/compare.js';
import { renderDocs, wireTOC, wireHeadingAnchors, fetchDoc, DOCS_SITEMAP } from './pages/docs.js';

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
  { id: 'light', label: 'Light', hint: 'Paper', swatches: ['#fafaf7', '#ffffff', '#b8541f', '#18181b'] },
  { id: 'dark', label: 'Dark', hint: 'Default', swatches: ['#0b0b0c', '#151517', '#f5c54a', '#f3f1ea'] },
  { id: 'dim', label: 'Dim', hint: 'Tokyo Night', swatches: ['#1a1b26', '#1f2030', '#7aa2f7', '#c0caf5'] },
  { id: 'solar', label: 'Solarized', hint: 'Warm', swatches: ['#fdf6e3', '#fffaf0', '#b8541f', '#3a2f1b'] },
];
const THEME_IDS = THEMES.map(t => t.id);
const prefersLight = matchMedia('(prefers-color-scheme: light)').matches;
const saved = localStorage.getItem('lume.theme');
const initialTheme = THEME_IDS.includes(saved) ? saved : (prefersLight ? 'light' : 'dark');

/* =========================================================================
   APP STORE
   ========================================================================= */
const _initRouterMode = localStorage.getItem('lume.routerMode') || 'history';

const store = state({
  theme: initialTheme,
  themeMenuOpen: false,
  verMenuOpen: false,
  route: { page: 'home', slug: null, params: {} },
  year: new Date().getFullYear(),
  clock: '',
  routerMode: _initRouterMode,
  routerTooltipTitle: _initRouterMode === 'hash' ? 'Hash routing active' : 'History routing active',
  routerTooltipBody: _initRouterMode === 'hash'
    ? 'URLs use #/path — works on any static host with no server config.'
    : 'URLs use /path — clean paths. Needs a server or 404 fallback.',
  toastVisible: false,
  toastTitle: '',
  toastUrl: '',
  toastDesc: '',
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
  '/': () => ({ page: 'home', slug: null, heading: null }),
  '/docs': () => ({ page: 'docs', slug: 'introduction', heading: null }),
  '/docs/:slug': (p) => ({ page: 'docs', slug: p.slug, heading: null }),
  '/docs/:slug/:heading': (p) => ({ page: 'docs', slug: p.slug, heading: p.heading }),
  '/examples': () => ({ page: 'examples', slug: null, heading: null }),
  '/compare': () => ({ page: 'compare', slug: null, heading: null }),
});
window.router = router;

/* =========================================================================
   PAGE RENDERING
   ========================================================================= */
const outlet = document.getElementById('outlet');
let currentCleanup = null;
let _currentDocSlug = null; // tracks which doc is rendered to detect heading-only nav

function _makeHashHeadingNav(slug) {
  return (headingId) => router.go(`/docs/${slug}/${headingId}`, { scrollTop: false });
}

watch(store, 'route', async (r) => {
  // Hash mode heading-only navigation: same doc, just scroll — no fetch, no re-render
  if (r.page === 'docs' && r.slug === _currentDocSlug) {
    const target = r.heading;
    if (target) {
      requestAnimationFrame(() => {
        const el = document.getElementById(target);
        if (!el) return;
        const top = el.getBoundingClientRect().top + window.scrollY - 80 - 12;
        window.scrollTo({ top, behavior: 'smooth' });
      });
    }
    return;
  }

  _currentDocSlug = r.page === 'docs' ? r.slug : null;

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

  if (r.page === 'docs') {
    wireTOC();
    wireHeadingAnchors(router.mode, _makeHashHeadingNav(r.slug || 'introduction'));

    // Scroll to heading if present in route (hash mode deep link) or URL fragment (history mode)
    const target = r.heading || location.hash.slice(1);
    if (target) {
      requestAnimationFrame(() => {
        const el = document.getElementById(target);
        if (!el) return;
        const top = el.getBoundingClientRect().top + window.scrollY - 80 - 12;
        window.scrollTo({ top, behavior: 'smooth' });
      });
    }
  }
}, { immediate: true });

function renderPage(r) {
  switch (r.page) {
    case 'home': return renderHome();
    case 'examples': return renderExamples();
    case 'compare': return renderCompare();
    default: return renderNotFound();
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
  const dark = document.getElementById('hljs-dark');
  if (light) light.disabled = !isLight;
  if (dark) dark.disabled = isLight;
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
   ROUTER MODE TOGGLE
   Lets users flip between hash and history routing live — great for seeing
   how each mode behaves and how Lume.js handles both.
   Switching saves the preference and reloads to the equivalent URL in the
   new mode (history→hash: add '#' prefix; hash→history: strip '#', rely on
   the 404 fallback to redirect back cleanly on GitHub Pages).
   ========================================================================= */
/* =========================================================================
   TOAST — Lume.js drives content via data-bind; watch drives visibility
   ========================================================================= */
const TOAST_DURATION_MS = 10_000;
document.documentElement.style.setProperty('--toast-duration', TOAST_DURATION_MS + 'ms');

let _toastTimer = null;
watch(store, 'toastVisible', (visible) => {
  const toast = document.getElementById('lume-toast');
  if (!toast) return;
  clearTimeout(_toastTimer);
  if (visible) {
    toast.classList.add('is-visible');
    _toastTimer = setTimeout(() => { store.toastVisible = false; }, TOAST_DURATION_MS);
  } else {
    toast.classList.remove('is-visible');
  }
});

window.switchRouterMode = function (newMode) {
  const currentRoute = store.route;
  const historyFragment = newMode === 'hash' ? location.hash.slice(1) : null;

  router.setMode(newMode);
  store.routerMode = newMode;

  // Rewrite URL to preserve heading in the new mode's encoding
  const _b = (import.meta.env.BASE_URL || '/').replace(/\/$/, '');
  if (newMode === 'history' && currentRoute.heading) {
    // hash: #/docs/intro/heading → history: /docs/intro#heading
    history.replaceState({ lume: true }, '', `${_b}/docs/${currentRoute.slug}#${currentRoute.heading}`);
  } else if (newMode === 'hash' && historyFragment && currentRoute.page === 'docs') {
    // history: /docs/intro#heading → hash: #/docs/intro/heading
    history.replaceState({ lume: true }, '', `${_b}/#/docs/${currentRoute.slug}/${historyFragment}`);
  }

  document.querySelectorAll('.heading-anchor').forEach(a => a.remove());
  if (store.route.page === 'docs') {
    wireHeadingAnchors(newMode, _makeHashHeadingNav(store.route.slug || 'introduction'));
  }

  store.routerTooltipTitle = newMode === 'hash' ? 'Hash routing active' : 'History routing active';
  store.routerTooltipBody = newMode === 'hash'
    ? 'URLs use #/path — works on any static host with no server config.'
    : 'URLs use /path — clean paths. Needs a server or 404 fallback.';

  store.toastTitle = newMode === 'hash' ? 'Switched to Hash routing' : 'Switched to History routing';
  store.toastUrl = location.href;
  store.toastDesc = newMode === 'hash'
    ? 'Zero server config. Works on any static host. Heading anchors scroll only — # is already the route.'
    : 'Clean URL paths. A 404 fallback handles deep links — already wired on this site.';

  // Reset animation if toast is already showing, then re-trigger via store
  store.toastVisible = false;
  requestAnimationFrame(() => { store.toastVisible = true; });
};

/* =========================================================================
   GLOBAL BINDINGS (header / footer / toast)
   ========================================================================= */
bindDom(document.querySelector('.site-header'), store, { handlers: [link(router)] });
bindDom(document.querySelector('.site-footer'), store, { handlers: [link(router)] });
bindDom(document.getElementById('lume-toast'), store, { handlers: [] });

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
