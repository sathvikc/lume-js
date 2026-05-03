/**
 * lume-router — History API + Hash router addon for Lume.js
 *
 * Mode detection (auto):
 *   - GitHub Pages (*.github.io) → hash mode
 *   - Any other host → history mode
 *   - Override: createRouter(store, 'route', routes, { mode: 'hash' | 'history' | 'auto' })
 *
 * GH Pages trick:
 *   Ship a 404.html next to index.html that encodes the path into ?_r=…
 *   On init, createRouter detects this and replaces state back to the real path.
 *
 * Usage:
 *   import { createRouter, link } from './lume-router.js';
 *   const router = createRouter(store, 'route', {
 *     '/'          : ()       => ({ page: 'home' }),
 *     '/docs/:slug': (p)      => ({ page: 'docs', slug: p.slug }),
 *   });
 *   // link(router) is a Lume handler — pass to bindDom's handlers array
 *   bindDom(document.body, store, { handlers: [link(router)] });
 */

/* ─── mode detection ─── */
function detectMode() {
  if (typeof window === 'undefined') return 'history';
  const h = location.hostname;
  if (
    h.endsWith('.github.io') ||
    h.endsWith('.gitlab.io') ||
    h === 'localhost' && location.port === '' // some static servers
  ) return 'hash';
  // Allow explicit opt-in via meta tag: <meta name="lume-router-mode" content="hash">
  const meta = document.querySelector('meta[name="lume-router-mode"]');
  if (meta) return meta.content === 'hash' ? 'hash' : 'history';
  return 'history';
}

/* ─── pattern compiler ─── */
function compile(pattern) {
  const re = pattern
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/\/:([A-Za-z_][A-Za-z0-9_]*)/g, '/(?<$1>[^/]+)')
    .replace(/\*/g, '.*');
  return new RegExp('^' + re + '/?$');
}

/* ─── GH Pages 404 redirect handler ─── */
// 404.html encodes the real path into ?_r=<encoded-path>
// We decode it on startup and replace history so the URL looks clean.
function handleGhPagesRedirect() {
  const params = new URLSearchParams(location.search);
  const redirected = params.get('_r');
  if (!redirected) return;
  const target = decodeURIComponent(redirected);
  // Strip _r from the query string and replace state
  const clean = target || '/';
  history.replaceState({ lume: true }, '', clean);
}

/* ─── main export ─── */
export function createRouter(store, key, routes, options = {}) {
  const mode = options.mode === 'auto' || !options.mode ? detectMode() : options.mode;

  handleGhPagesRedirect();

  const compiled = Object.entries(routes).map(([pattern, resolve]) => ({
    pattern,
    resolve,
    re: compile(pattern),
  }));

  function matchPathname(pathname) {
    for (const r of compiled) {
      const m = pathname.match(r.re);
      if (m) {
        const params = { ...m.groups };
        return { pattern: r.pattern, params, value: r.resolve(params, pathname) };
      }
    }
    return { pattern: null, params: {}, value: { page: '404' } };
  }

  function currentPathname() {
    if (mode === 'hash') {
      const h = (location.hash || '#/').slice(1); // '#/docs/foo' → '/docs/foo'
      return h || '/';
    }
    return location.pathname;
  }

  function read() {
    const pathname = currentPathname();
    const m = matchPathname(pathname);
    return { ...m.value, pathname, params: m.params || {} };
  }

  /* initial route */
  store[key] = read();

  function go(to, { replace = false } = {}) {
    const pathname = typeof to === 'string' ? to : String(to);
    if (mode === 'hash') {
      const newHash = '#' + pathname;
      if (replace) history.replaceState({ lume: true }, '', newHash);
      else         history.pushState({ lume: true }, '', newHash);
    } else {
      if (replace) history.replaceState({ lume: true }, '', pathname);
      else         history.pushState({ lume: true }, '', pathname);
    }
    store[key] = read();
    window.scrollTo({ top: 0, behavior: 'instant' });
  }

  // Back / forward
  window.addEventListener('popstate', () => { store[key] = read(); });

  // Hash change (hash mode)
  if (mode === 'hash') {
    window.addEventListener('hashchange', () => { store[key] = read(); });
  }

  return { go, mode, read, matchPathname };
}

/**
 * link(router) — Lume.js handler that intercepts <a data-link> clicks
 * and routes them through the router instead of doing a page load.
 *
 * Respects: modifier keys, target="_blank", external origins, download, #anchors
 */
export function link(router) {
  if (!link._installed) {
    document.addEventListener('click', (ev) => {
      if (ev.defaultPrevented)  return;
      if (ev.button !== 0)      return;
      if (ev.metaKey || ev.ctrlKey || ev.shiftKey || ev.altKey) return;

      const a = ev.target.closest('a[data-link]');
      if (!a) return;
      if (a.target && a.target !== '' && a.target !== '_self') return;
      if (a.hasAttribute('download')) return;

      const href = a.getAttribute('href');
      if (!href) return;
      if (/^[a-z][a-z0-9+.-]*:/i.test(href)) return; // protocol
      if (href.startsWith('//')) return;              // protocol-relative

      // In-page anchors (#section) — let browser handle; DON'T intercept
      if (href.startsWith('#')) return;

      ev.preventDefault();

      // Resolve the href to a pathname
      const url = new URL(href, location.href);
      if (url.origin !== location.origin) return;

      const target = url.pathname + url.search + url.hash;

      // No-op if already on this path (history mode)
      if (router.mode === 'history') {
        const cur = location.pathname + location.search + location.hash;
        if (target === cur) return;
      }
      // No-op if already on this hash (hash mode)
      if (router.mode === 'hash') {
        const curHash = (location.hash || '#/').slice(1);
        if (url.pathname === curHash) return;
      }

      router.go(url.pathname + url.search);
    });
    link._installed = true;
  }
  return { attr: 'data-link', apply() {} };
}
