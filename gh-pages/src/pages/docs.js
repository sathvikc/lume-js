export const DOCS_SITEMAP = [
  { slug: 'introduction',         title: 'Introduction',         category: 'Getting started', file: 'docs/README.md' },
  { slug: 'installation',         title: 'Installation',         category: 'Getting started', file: 'docs/guides/installation.md' },
  { slug: 'quick-start',          title: 'Quick start',          category: 'Getting started', file: 'docs/guides/quick-start.md' },
  { slug: 'core-concepts',        title: 'Core concepts',        category: 'Guides',          file: 'docs/guides/core-concepts.md' },
  { slug: 'reactivity',           title: 'How reactivity works', category: 'Guides',          file: 'docs/guides/reactivity.md' },
  { slug: 'handlers',             title: 'Handlers',             category: 'Guides',          file: 'docs/guides/handlers.md' },
  { slug: 'two-way-binding',      title: 'Two-way binding',      category: 'Guides',          file: 'docs/guides/two-way-binding.md' },
  { slug: 'lists',                title: 'Lists & repeat',       category: 'Guides',          file: 'docs/guides/lists.md' },
  { slug: 'forms',                title: 'Forms',                category: 'Guides',          file: 'docs/guides/forms.md' },
  { slug: 'routing',              title: 'Routing',              category: 'Guides',          file: 'docs/guides/routing.md' },
  { slug: 'animations',           title: 'Animations',           category: 'Guides',          file: 'docs/guides/animations.md' },
  { slug: 'testing',              title: 'Testing',              category: 'Guides',          file: 'docs/guides/testing.md' },
  { slug: 'performance',          title: 'Performance',          category: 'Guides',          file: 'docs/guides/performance.md' },
  { slug: 'cleanup-and-dispose',  title: 'Cleanup & Dispose',    category: 'Guides',          file: 'docs/guides/cleanup-and-dispose.md' },
  { slug: 'ssr-hydration',        title: 'SSR & Hydration',      category: 'Guides',          file: 'docs/guides/ssr-hydration.md' },
  { slug: 'api-state',            title: 'state()',              category: 'API — Core',      file: 'docs/api/core/state.md' },
  { slug: 'api-bindDom',          title: 'bindDom()',            category: 'API — Core',      file: 'docs/api/core/bindDom.md' },
  { slug: 'api-effect',           title: 'effect()',             category: 'API — Core',      file: 'docs/api/core/effect.md' },
  { slug: 'api-handlers',         title: 'Handlers API',         category: 'API — Core',      file: 'docs/api/core/handlers.md' },
  { slug: 'api-plugins',          title: 'withPlugins()',        category: 'API — Core',      file: 'docs/api/core/plugins.md' },
  { slug: 'api-watch',            title: 'watch()',              category: 'API — Addons',    file: 'docs/api/addons/watch.md' },
  { slug: 'api-computed',         title: 'computed()',           category: 'API — Addons',    file: 'docs/api/addons/computed.md' },
  { slug: 'api-repeat',           title: 'repeat()',             category: 'API — Addons',    file: 'docs/api/addons/repeat.md' },
  { slug: 'api-show',             title: 'show',                 category: 'API — Handlers',  file: 'docs/api/handlers/show.md' },
  { slug: 'api-classToggle',      title: 'classToggle',          category: 'API — Handlers',  file: 'docs/api/handlers/classToggle.md' },
  { slug: 'api-stringAttr',       title: 'stringAttr',           category: 'API — Handlers',  file: 'docs/api/handlers/stringAttr.md' },
  { slug: 'api-debug',            title: 'createDebugPlugin',    category: 'API — Addons',    file: 'docs/api/addons/debug.md' },
  { slug: 'tutorial-todo',        title: 'Build a Todo app',     category: 'Tutorials',       file: 'docs/tutorials/build-todo-app.md' },
  { slug: 'tutorial-tic-tac-toe', title: 'Build Tic-Tac-Toe',   category: 'Tutorials',       file: 'docs/tutorials/build-tic-tac-toe.md' },
  { slug: 'migration',            title: 'Migrating from 1.x',  category: 'Reference',       file: 'docs/guides/migration.md' },
  { slug: 'faq',                  title: 'FAQ',                  category: 'Reference',       file: 'docs/guides/faq.md' },
  { slug: 'design-decisions',     title: 'Design decisions',     category: 'Design',          file: 'docs/design/design-decisions.md' },
];

// Reverse map: file path → slug (for link rewriting)
const _fileToSlug = new Map(DOCS_SITEMAP.map(d => [d.file, d.slug]));

// Resolve a relative .md link inside a doc file to a slug, or null
function _resolveLink(currentFile, href) {
  if (!href.endsWith('.md') || href.startsWith('http') || href.startsWith('#')) return null;
  const dir = currentFile.split('/').slice(0, -1);
  const parts = [...dir, ...href.split('/')];
  const resolved = [];
  for (const p of parts) {
    if (p === '.' || p === '') continue;
    if (p === '..') resolved.pop();
    else resolved.push(p);
  }
  return _fileToSlug.get(resolved.join('/')) || null;
}

export async function fetchDoc(slug) {
  const meta = DOCS_SITEMAP.find(d => d.slug === slug);
  if (!meta) return null;

  const base = import.meta.env.BASE_URL;
  let res;
  try {
    res = await fetch(`${base}${meta.file}`);
  } catch {
    return null;
  }
  if (!res.ok) return null;

  const md = await res.text();
  let content = md.replace(/^---[\s\S]+?---\n?/, '').trim();

  // Strip trailing markdown page-nav (--- section with ← Previous / Next → links).
  // Check only the LAST --- block — not the first. Docs that use → inside bullet
  // points (e.g. design-decisions.md) would have their body stripped by a greedy match.
  const lastHr = content.lastIndexOf('\n---\n');
  if (lastHr !== -1) {
    const tail = content.slice(lastHr);
    if (/Previous|Next|←|→/.test(tail)) content = content.slice(0, lastHr);
  }

  if (typeof marked === 'undefined') return `<pre>${content}</pre>`;

  const html = marked.parse(content);

  // Rewrite .md links to SPA routes
  return html.replace(/href="([^"]+\.md)([^"]*)"/g, (match, href, hash) => {
    const targetSlug = _resolveLink(meta.file, href);
    if (targetSlug) return `href="/docs/${targetSlug}${hash}" data-link`;
    return match;
  });
}

function renderNotFoundInline() {
  return `
    <div class="max-w-[1280px] mx-auto px-4 sm:px-6 flex items-center justify-center min-h-[40vh]">
      <div class="text-center">
        <div class="text-5xl mb-3">📄</div>
        <h2 class="font-serif text-fg text-2xl mb-2">Page not found</h2>
        <p class="text-fg-subtle">This doc page doesn't exist yet.</p>
        <a href="/docs/introduction" data-link
           class="inline-flex items-center gap-2 mt-4 px-[18px] py-[11px] rounded-[10px] font-medium text-sm bg-accent text-accent-contrast border border-transparent transition-all hover:brightness-[1.08] hover:-translate-y-px">
          Back to docs
        </a>
      </div>
    </div>
  `;
}

/* ─── sidebar nav HTML (private) ─── */
function _renderSidebarNav(activeSlug) {
  const groups = {};
  for (const d of DOCS_SITEMAP) {
    (groups[d.category] ||= []).push({ slug: d.slug, title: d.title });
  }
  return Object.entries(groups).map(([cat, items]) => `
    <h5 class="font-mono text-[10.5px] font-semibold text-fg-subtle uppercase tracking-widest mt-5 mb-2 px-2 first:mt-0">${cat}</h5>
    <ul class="list-none p-0 m-0">${items.map(it => `
      <li><a href="/docs/${it.slug}" data-link
             class="block px-3 py-1.5 rounded-md text-fg-muted transition-all hover:text-fg hover:bg-bg-sunken${it.slug === activeSlug ? ' active' : ''}">${it.title}</a></li>
    `).join('')}</ul>
  `).join('');
}

/* ─── article HTML only (swapped on every doc nav) ─── */
export function renderDocsArticle(slug, html) {
  const meta = DOCS_SITEMAP.find(d => d.slug === slug);
  if (!meta || !html) return renderNotFoundInline();

  const idx = DOCS_SITEMAP.findIndex(d => d.slug === slug);
  const prev = idx > 0 ? DOCS_SITEMAP[idx - 1] : null;
  const next = idx < DOCS_SITEMAP.length - 1 ? DOCS_SITEMAP[idx + 1] : null;

  return `
    <article class="docs-main min-w-0">
      <div class="crumb">Docs · ${meta.category}</div>
      ${html}
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-16 pt-8 border-t border-border">
        ${prev ? `<a href="/docs/${prev.slug}" data-link class="group block p-4 px-5 bg-bg-raised border border-border rounded-2xl text-fg no-underline transition-all hover:border-accent hover:bg-bg-sunken active:scale-[0.98]">
          <div class="font-mono text-[10.5px] text-fg-subtle uppercase tracking-widest mb-1 transition-colors group-hover:text-accent">← Previous</div>
          <div class="font-serif font-medium text-lg text-fg">${prev.title}</div>
        </a>` : '<span></span>'}
        ${next ? `<a href="/docs/${next.slug}" data-link class="group block p-4 px-5 bg-bg-raised border border-border rounded-2xl text-fg no-underline text-right transition-all hover:border-accent hover:bg-bg-sunken active:scale-[0.98]">
          <div class="font-mono text-[10.5px] text-fg-subtle uppercase tracking-widest mb-1 transition-colors group-hover:text-accent">Next →</div>
          <div class="font-serif font-medium text-lg text-fg">${next.title}</div>
        </a>` : '<span></span>'}
      </div>
    </article>
  `;
}

/* ─── mount docs shell — populate sidebar nav and wire drawer/search (called once) ─── */
export function mountDocsShell(slug) {
  const navHtml = _renderSidebarNav(slug);
  const navEl       = document.getElementById('docs-nav');
  const navMobileEl = document.getElementById('docs-nav-mobile');
  if (navEl)       navEl.innerHTML       = navHtml;
  if (navMobileEl) navMobileEl.innerHTML = navHtml;

  const toggleBtn   = document.getElementById('docs-mobile-toggle');
  const backdrop    = document.getElementById('docs-drawer-backdrop');
  const drawer      = document.getElementById('docs-drawer');
  const closeBtn    = document.getElementById('docs-drawer-close');
  const mobileSearch = document.getElementById('docs-search-mobile');

  function openDrawer()  { drawer?.classList.add('is-open'); backdrop?.classList.remove('hidden'); document.body.style.overflow = 'hidden'; }
  function closeDrawer() { drawer?.classList.remove('is-open'); backdrop?.classList.add('hidden'); document.body.style.overflow = ''; }

  toggleBtn?.addEventListener('click', openDrawer);
  closeBtn?.addEventListener('click', closeDrawer);
  backdrop?.addEventListener('click', closeDrawer);
  navMobileEl?.querySelectorAll('a[data-link]').forEach(a => a.addEventListener('click', closeDrawer));

  mobileSearch?.addEventListener('input', () => {
    const q = mobileSearch.value.trim().toLowerCase();
    navMobileEl?.querySelectorAll('li').forEach(li => {
      li.style.display = !q || li.textContent.toLowerCase().includes(q) ? '' : 'none';
    });
  });

  const desktopSearch = document.getElementById('docs-search');
  desktopSearch?.addEventListener('input', () => {
    const q = desktopSearch.value.trim().toLowerCase();
    navEl?.querySelectorAll('li').forEach(li => {
      li.style.display = !q || li.textContent.toLowerCase().includes(q) ? '' : 'none';
    });
  });
}

/* ─── update active sidebar link + breadcrumb (called on every doc nav) ─── */
export function updateDocsShellForSlug(slug) {
  const meta = DOCS_SITEMAP.find(d => d.slug === slug);
  document.querySelectorAll('#docs-nav a, #docs-nav-mobile a').forEach(a => {
    a.classList.toggle('active', a.getAttribute('href') === `/docs/${slug}`);
  });
  const crumb = document.getElementById('docs-breadcrumb');
  if (crumb && meta) crumb.textContent = `${meta.category} · ${meta.title}`;
}

/* ─── wire TOC observers — returns cleanup, called after every article swap ─── */
export function wireTOC() {
  const main = document.querySelector('.docs-main');
  const toc  = document.getElementById('toc');
  if (!main || !toc) return () => {};

  const headings = main.querySelectorAll('h2, h3');
  if (!headings.length) { toc.innerHTML = ''; return () => {}; }

  const items = [...headings].map((h, i) => {
    const id = h.id || `h-${i}-${h.textContent.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40)}`;
    h.id = id;
    return { id, text: h.textContent, level: h.tagName.toLowerCase() };
  });

  toc.innerHTML = `
    <h6 class="font-mono text-[10.5px] font-semibold text-fg-subtle uppercase tracking-widest mb-3">On this page</h6>
    <ul class="list-none p-0 m-0">${items.map(it => `<li class="${it.level}"><a href="#${it.id}"
      class="block py-1 px-2 text-fg-muted border-l-2 border-border mb-0.5 transition-colors hover:text-fg hover:border-border-strong${it.level === 'h3' ? ' pl-4 text-xs' : ''}">${it.text}</a></li>`).join('')}</ul>
  `;

  const HEADER_H = 80;
  const headingEls = items.map(it => document.getElementById(it.id)).filter(Boolean);
  let activeId = null;

  function updateActiveTOC(id) {
    if (id === activeId) return;
    activeId = id;
    toc.querySelectorAll('a').forEach(a => {
      a.classList.toggle('is-current', a.getAttribute('href').slice(1) === id);
    });
  }

  const io = new IntersectionObserver((entries) => {
    const intersecting = entries
      .filter(e => e.isIntersecting)
      .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
    if (intersecting.length) updateActiveTOC(intersecting[0].target.id);
  }, { rootMargin: `-${HEADER_H}px 0px -60% 0px`, threshold: 0 });

  headingEls.forEach(el => io.observe(el));

  const onScroll = () => {
    const scrollY = window.scrollY + HEADER_H + 16;
    let best = headingEls[0];
    for (const el of headingEls) {
      if (el.offsetTop <= scrollY) best = el;
    }
    if (best) updateActiveTOC(best.id);
  };
  window.addEventListener('scroll', onScroll, { passive: true });

  // Set initial active heading based on current scroll
  {
    const scrollY = window.scrollY + HEADER_H + 16;
    let best = headingEls[0];
    for (const el of headingEls) { if (el.offsetTop <= scrollY) best = el; }
    if (best) updateActiveTOC(best.id);
  }

  toc.querySelectorAll('a').forEach(a => {
    a.addEventListener('click', (e) => {
      e.preventDefault();
      const id = a.getAttribute('href').slice(1);
      const el = document.getElementById(id);
      if (!el) return;
      const top = el.getBoundingClientRect().top + window.scrollY - HEADER_H - 12;
      window.scrollTo({ top, behavior: 'smooth' });
      updateActiveTOC(id);
    });
  });

  return () => { io.disconnect(); window.removeEventListener('scroll', onScroll); };
}

const LINK_ICON = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/></svg>`;
const HEADER_OFFSET = 80;

export function wireHeadingAnchors(mode, onHashHeadingNav) {
  const main = document.querySelector('.docs-main');
  if (!main) return;

  main.querySelectorAll('h2[id], h3[id]').forEach(h => {
    if (h.querySelector('.heading-anchor')) return;

    const anchor = document.createElement('a');
    anchor.className = 'heading-anchor';
    anchor.setAttribute('aria-label', 'Link to this section');
    anchor.innerHTML = LINK_ICON;

    if (mode === 'history') {
      anchor.href = '#' + h.id;
    } else {
      anchor.href = 'javascript:void(0)';
    }

    anchor.addEventListener('click', (e) => {
      e.preventDefault();

      if (mode === 'history') {
        const top = h.getBoundingClientRect().top + window.scrollY - HEADER_OFFSET - 12;
        window.scrollTo({ top, behavior: 'smooth' });
        history.pushState({}, '', location.pathname + '#' + h.id);
        navigator.clipboard?.writeText(location.href).catch(() => {});
        anchor.classList.add('is-copied');
        setTimeout(() => anchor.classList.remove('is-copied'), 1500);
      } else if (onHashHeadingNav) {
        onHashHeadingNav(h.id);
        navigator.clipboard?.writeText(location.href).catch(() => {});
        anchor.classList.add('is-copied');
        setTimeout(() => anchor.classList.remove('is-copied'), 1500);
      }
    });

    h.appendChild(anchor);
  });
}
