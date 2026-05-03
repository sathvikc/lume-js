/**
 * lume-router — History API + Hash router addon for Lume.js
 *
 * Mode detection (auto):
 *   - Checks localStorage('lume.routerMode') first
 *   - Defaults to 'history' — the 404.html fallback handles GitHub Pages
 *   - Override: createRouter(store, 'route', routes, { mode: 'hash' | 'history' | 'auto' })
 *
 * GH Pages trick (history mode):
 *   Ship a 404.html that encodes the app-relative path into ?_r=…
 *   On init, createRouter detects this, reconstructs the full URL with the
 *   Vite base path, and replaces state so the URL looks clean.
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

// Vite replaces this at build time: '/' in dev, '/lume-js/' in production.
// Stripping the trailing slash gives us a clean prefix to prepend/strip.
const _BASE = (import.meta.env.BASE_URL || '/').replace(/\/$/, ''); // '' or '/lume-js'

/* ─── mode detection ─── */
function detectMode() {
  if (typeof window === 'undefined') return 'history';
  // User's stored preference wins over everything else
  const stored = localStorage.getItem('lume.routerMode');
  if (stored === 'hash' || stored === 'history') return stored;
  // Default: history mode — the 404.html fallback makes it work on GitHub Pages
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
// 404.html encodes the app-relative path into ?_r=<encoded-path> and redirects
// to the app root. We decode it and replaceState so the URL looks like a normal
// navigation — the rest of the router never knows the redirect happened.
function handleGhPagesRedirect() {
  const params = new URLSearchParams(location.search);
  const redirected = params.get('_r');
  if (!redirected) return;
  // _r holds the app-relative path e.g. '/docs/introduction' (without base prefix)
  const appPath = decodeURIComponent(redirected);
  // Reconstruct the full URL path including the Vite base
  const fullPath = _BASE + (appPath.startsWith('/') ? appPath : '/' + appPath);
  history.replaceState({ lume: true }, '', fullPath);
}

/* ─── main export ─── */
export function createRouter(store, key, routes, options = {}) {
  let mode = options.mode === 'auto' || !options.mode ? detectMode() : options.mode;

  // Only restore the redirect in history mode — hash mode never triggers 404.html
  if (mode === 'history') handleGhPagesRedirect();

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
    // History mode: strip the Vite base prefix before matching routes.
    // In dev _BASE='' so this is a no-op. In prod _BASE='/lume-js' so
    // '/lume-js/docs/intro' → '/docs/intro' which matches '/docs/:slug'.
    const raw = location.pathname;
    if (_BASE && raw.startsWith(_BASE)) {
      return raw.slice(_BASE.length) || '/';
    }
    return raw;
  }

  function read() {
    const pathname = currentPathname();
    const m = matchPathname(pathname);
    return { ...m.value, pathname, params: m.params || {} };
  }

  /* initial route */
  store[key] = read();

  function go(to, { replace = false, scrollTop = true } = {}) {
    const pathname = typeof to === 'string' ? to : String(to);
    if (mode === 'hash') {
      const newHash = '#' + pathname;
      if (replace) history.replaceState({ lume: true }, '', newHash);
      else         history.pushState({ lume: true }, '', newHash);
    } else {
      const fullPath = _BASE + pathname;
      if (replace) history.replaceState({ lume: true }, '', fullPath);
      else         history.pushState({ lume: true }, '', fullPath);
    }
    store[key] = read();
    if (scrollTop) window.scrollTo({ top: 0, behavior: 'instant' });
  }

  // Back / forward (always installed — works in both modes)
  window.addEventListener('popstate', () => { store[key] = read(); });

  // hashchange listener managed separately so setMode can add/remove it
  const onHashChange = () => { store[key] = read(); };
  if (mode === 'hash') window.addEventListener('hashchange', onHashChange);

  /**
   * setMode(newMode) — switch routing mode live without a page reload.
   *
   * Rewrites the current URL to the equivalent form in the new mode using
   * replaceState (no navigation, no server request), swaps the hashchange
   * listener, and re-reads the route so reactive state stays consistent.
   *
   * Callers should also update any mode-dependent UI (e.g. heading anchors).
   */
  function setMode(newMode) {
    if (newMode === mode) return;
    const currentPath = currentPathname(); // read before switching
    mode = newMode;
    localStorage.setItem('lume.routerMode', newMode);

    if (newMode === 'hash') {
      // Use an absolute path so the hash lands on the app root, not on the
      // current deep URL (which would give /docs/intro#/docs/intro).
      history.replaceState({ lume: true }, '', _BASE + '/#' + currentPath);
      window.addEventListener('hashchange', onHashChange);
    } else {
      history.replaceState({ lume: true }, '', _BASE + currentPath);
      window.removeEventListener('hashchange', onHashChange);
    }

    store[key] = read();
  }

  // Expose mode as a getter so link() and callers always see the live value
  return {
    go,
    get mode() { return mode; },
    read,
    matchPathname,
    setMode,
  };
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

      // No-op if already on this path.
      // Compare against the app-relative path (routes don't include the base).
      if (router.mode === 'history') {
        const rawCur = (_BASE && location.pathname.startsWith(_BASE))
          ? location.pathname.slice(_BASE.length) || '/'
          : location.pathname;
        const curFull = rawCur + location.search + location.hash;
        if (url.pathname + url.search + url.hash === curFull) return;
      }
      if (router.mode === 'hash') {
        const curHash = (location.hash || '#/').slice(1);
        if (url.pathname === curHash) return;
      }

      // Preserve the hash fragment: history mode appends it to the URL;
      // hash mode embeds it as a path segment (# is already used for routing).
      const headingId = url.hash.slice(1);
      if (router.mode === 'history') {
        router.go(url.pathname + url.search + (url.hash || ''));
      } else if (headingId) {
        router.go(url.pathname + url.search + '/' + headingId);
      } else {
        router.go(url.pathname + url.search);
      }
    });
    link._installed = true;
  }
  return { attr: 'data-link', apply() {} };
}
