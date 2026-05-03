export const DOCS_SITEMAP = [
  { slug: 'introduction',         title: 'Introduction',         category: 'Getting started', file: 'docs/README.md' },
  { slug: 'installation',         title: 'Installation',         category: 'Getting started', file: 'docs/guides/installation.md' },
  { slug: 'quick-start',          title: 'Quick start',          category: 'Getting started', file: 'docs/guides/quick-start.md' },
  { slug: 'core-concepts',        title: 'Core concepts',        category: 'Guides',          file: 'docs/guides/core-concepts.md' },
  { slug: 'reactivity',           title: 'How reactivity works', category: 'Guides',          file: 'docs/guides/reactivity.md' },
  { slug: 'handlers',             title: 'Handlers',             category: 'Guides',          file: 'docs/guides/handlers.md' },
  { slug: 'two-way-binding',      title: 'Two-way binding',      category: 'Guides',          file: 'docs/guides/two-way-binding.md' },
  { slug: 'lists',                title: 'Lists & repeat',       category: 'Guides',          file: 'docs/guides/lists.md' },
  { slug: 'performance',          title: 'Performance',          category: 'Guides',          file: 'docs/guides/performance.md' },
  { slug: 'api-state',            title: 'state()',              category: 'API — Core',      file: 'docs/api/core/state.md' },
  { slug: 'api-bindDom',          title: 'bindDom()',            category: 'API — Core',      file: 'docs/api/core/bindDom.md' },
  { slug: 'api-effect',           title: 'effect()',             category: 'API — Core',      file: 'docs/api/core/effect.md' },
  { slug: 'api-watch',            title: 'watch()',              category: 'API — Addons',    file: 'docs/api/addons/watch.md' },
  { slug: 'api-computed',         title: 'computed()',           category: 'API — Addons',    file: 'docs/api/addons/computed.md' },
  { slug: 'api-repeat',           title: 'repeat()',             category: 'API — Addons',    file: 'docs/api/addons/repeat.md' },
  { slug: 'api-show',             title: 'show',                 category: 'API — Handlers',  file: 'docs/api/handlers/show.md' },
  { slug: 'api-classToggle',      title: 'classToggle',          category: 'API — Handlers',  file: 'docs/api/handlers/classToggle.md' },
  { slug: 'api-stringAttr',       title: 'stringAttr',           category: 'API — Handlers',  file: 'docs/api/handlers/stringAttr.md' },
  { slug: 'tutorial-todo',        title: 'Build a Todo app',     category: 'Tutorials',       file: 'docs/tutorials/build-todo-app.md' },
  { slug: 'tutorial-tic-tac-toe', title: 'Build Tic-Tac-Toe',   category: 'Tutorials',       file: 'docs/tutorials/build-tic-tac-toe.md' },
  { slug: 'migration',            title: 'Migrating from 1.x',  category: 'Reference',       file: 'docs/guides/migration.md' },
  { slug: 'changelog',            title: 'Changelog',            category: 'Reference',       file: 'docs/CHANGELOG.md' },
  { slug: 'faq',                  title: 'FAQ',                  category: 'Reference',       file: 'docs/guides/faq.md' },
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

  // Strip trailing markdown page-nav (--- section with ← Previous / Next → links)
  content = content.replace(/\n---\n[\s\S]*$/, (match) =>
    /Previous|Next|←|→/.test(match) ? '' : match
  );

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

export function renderDocs(slug, html) {
  const meta = DOCS_SITEMAP.find(d => d.slug === slug);
  if (!meta || !html) return renderNotFoundInline();

  const groups = {};
  for (const d of DOCS_SITEMAP) {
    (groups[d.category] ||= []).push({ slug: d.slug, title: d.title });
  }

  const sidebar = Object.entries(groups).map(([cat, items]) => `
    <h5 class="font-mono text-[10.5px] font-semibold text-fg-subtle uppercase tracking-widest mt-5 mb-2 px-2 first:mt-0">${cat}</h5>
    <ul class="list-none p-0 m-0">${items.map(it => `
      <li><a href="/docs/${it.slug}" data-link
             class="block px-3 py-1.5 rounded-md text-fg-muted transition-all hover:text-fg hover:bg-bg-sunken${it.slug === slug ? ' active' : ''}">${it.title}</a></li>
    `).join('')}</ul>
  `).join('');

  const idx = DOCS_SITEMAP.findIndex(d => d.slug === slug);
  const prev = idx > 0 ? DOCS_SITEMAP[idx - 1] : null;
  const next = idx < DOCS_SITEMAP.length - 1 ? DOCS_SITEMAP[idx + 1] : null;

  return `
    <!-- Mobile nav bar — visible below lg -->
    <div class="lg:hidden sticky top-16 z-20 bg-bg/90 backdrop-blur border-b border-border px-4 py-2.5 flex items-center gap-3">
      <button id="docs-mobile-toggle"
              class="inline-flex items-center gap-2 text-[13px] font-medium text-fg-muted border border-border bg-bg-raised rounded-lg px-3 py-1.5 transition-all hover:text-fg hover:border-border-strong">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
        Contents
      </button>
      <span class="text-[12px] text-fg-subtle font-mono">${meta.category} · ${meta.title}</span>
    </div>

    <!-- Mobile sidebar drawer -->
    <div id="docs-drawer-backdrop" class="docs-drawer-backdrop fixed inset-0 z-40 bg-[rgba(0,0,0,.45)] backdrop-blur-[2px] hidden lg:hidden"></div>
    <div id="docs-drawer" class="docs-drawer fixed top-0 left-0 z-50 h-full w-72 max-w-[85vw] bg-bg border-r border-border overflow-y-auto text-[13.5px] p-5 lg:hidden">
      <div class="flex items-center justify-between mb-4">
        <span class="font-mono text-[11px] font-semibold text-fg-subtle uppercase tracking-widest">Contents</span>
        <button id="docs-drawer-close" class="w-8 h-8 inline-flex items-center justify-center rounded-md text-fg-muted hover:text-fg hover:bg-bg-sunken transition-all border-0 bg-transparent cursor-pointer">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
      <div class="flex items-center gap-2 px-3 py-2 mb-4 bg-bg-raised border border-border rounded-lg">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-fg-subtle shrink-0"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>
        <input id="docs-search-mobile" type="text" placeholder="Filter pages…" autocomplete="off"
               class="flex-1 border-0 bg-transparent text-fg font-sans text-[13px] outline-none placeholder:text-fg-subtle">
      </div>
      <div id="docs-nav-mobile">${sidebar}</div>
    </div>

    <div class="max-w-[1280px] mx-auto px-4 sm:px-6 grid grid-cols-1 lg:grid-cols-[260px_1fr] xl:grid-cols-[260px_1fr_200px] gap-10 pt-10 pb-20 min-h-[calc(100vh-64px)]">
      <aside class="docs-sidebar hidden lg:block w-64 shrink-0 sticky top-20 self-start max-h-[calc(100vh-80px)] overflow-y-auto text-[13.5px] pr-2">
        <div class="flex items-center gap-2 px-3 py-2 mb-4 bg-bg-raised border border-border rounded-lg">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-fg-subtle shrink-0"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>
          <input id="docs-search" type="text" placeholder="Filter pages…" autocomplete="off"
                 class="flex-1 border-0 bg-transparent text-fg font-sans text-[13px] outline-none placeholder:text-fg-subtle">
        </div>
        <div id="docs-nav">${sidebar}</div>
      </aside>
      <article class="docs-main min-w-0">
        <div class="crumb">Docs · ${meta.category}</div>
        ${html}
        <div class="grid grid-cols-2 gap-4 mt-16 pt-8 border-t border-border">
          ${prev ? `<a href="/docs/${prev.slug}" data-link class="block p-4 px-5 bg-bg-raised border border-border rounded-[10px] text-fg no-underline transition-all hover:border-accent">
            <div class="font-mono text-[10.5px] text-fg-subtle uppercase tracking-widest mb-1">← Previous</div>
            <div class="font-serif font-medium text-lg text-fg">${prev.title}</div>
          </a>` : '<span></span>'}
          ${next ? `<a href="/docs/${next.slug}" data-link class="block p-4 px-5 bg-bg-raised border border-border rounded-[10px] text-fg no-underline text-right transition-all hover:border-accent">
            <div class="font-mono text-[10.5px] text-fg-subtle uppercase tracking-widest mb-1">Next →</div>
            <div class="font-serif font-medium text-lg text-fg">${next.title}</div>
          </a>` : '<span></span>'}
        </div>
      </article>
      <aside class="toc hidden xl:block w-48 shrink-0 sticky top-20 self-start max-h-[calc(100vh-80px)] overflow-y-auto text-[12.5px]" id="toc"></aside>
    </div>
  `;
}

export function wireTOC() {
  // Mobile drawer wiring
  const toggleBtn  = document.getElementById('docs-mobile-toggle');
  const backdrop   = document.getElementById('docs-drawer-backdrop');
  const drawer     = document.getElementById('docs-drawer');
  const closeBtn   = document.getElementById('docs-drawer-close');
  const mobileSearch = document.getElementById('docs-search-mobile');

  function openDrawer()  { drawer?.classList.add('is-open'); backdrop?.classList.remove('hidden'); document.body.style.overflow = 'hidden'; }
  function closeDrawer() { drawer?.classList.remove('is-open'); backdrop?.classList.add('hidden'); document.body.style.overflow = ''; }

  toggleBtn?.addEventListener('click', openDrawer);
  closeBtn?.addEventListener('click', closeDrawer);
  backdrop?.addEventListener('click', closeDrawer);
  drawer?.querySelectorAll('a[data-link]').forEach(a => a.addEventListener('click', closeDrawer));

  if (mobileSearch) {
    mobileSearch.addEventListener('input', () => {
      const q = mobileSearch.value.trim().toLowerCase();
      document.querySelectorAll('#docs-nav-mobile li').forEach(li => {
        li.style.display = !q || li.textContent.toLowerCase().includes(q) ? '' : 'none';
      });
    });
  }

  const main = document.querySelector('.docs-main');
  const toc  = document.getElementById('toc');
  if (!main || !toc) return;

  const headings = main.querySelectorAll('h2, h3');
  if (!headings.length) { toc.innerHTML = ''; return; }

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

  window.addEventListener('scroll', () => {
    const scrollY = window.scrollY + HEADER_H + 16;
    let best = headingEls[0];
    for (const el of headingEls) {
      if (el.offsetTop <= scrollY) best = el;
    }
    if (best) updateActiveTOC(best.id);
  }, { passive: true });

  // Set initial active heading based on current scroll position
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

  const search = document.getElementById('docs-search');
  if (search) {
    search.addEventListener('input', () => {
      const q = search.value.trim().toLowerCase();
      document.querySelectorAll('#docs-nav li').forEach(li => {
        li.style.display = !q || li.textContent.toLowerCase().includes(q) ? '' : 'none';
      });
    });
  }
}
