// highlight.js is loaded globally from CDN in index.html
import { bindDom, effect, state } from 'lume-js';
import { watch } from 'lume-js/addons';
import { Comparison } from './components/Comparison.js';
import { DocsViewer } from './components/DocsViewer.js';
import { ExampleViewer } from './components/ExampleViewer.js';
import { Features } from './components/Features.js';
import { Footer } from './components/Footer.js';
import { Header } from './components/Header.js';
import { Hero } from './components/Hero.js';
import { Sidebar } from './components/Sidebar.js';
import './style.css';

// --- Helper Functions ---
function getBaseUrl() {
  const base = import.meta.env.BASE_URL;
  return base.endsWith('/') ? base : base + '/';
}

function isExampleType(type) {
  return type === 'example' || type === 'external';
}

// --- Site Navigation Map ---
const SITE_MAP = [
  // Introduction
  { path: 'docs/', title: 'Introduction', file: 'docs/README.md' },

  // Tutorials
  { path: 'docs/tutorials/build-todo-app', title: 'Build Todo App', file: 'docs/tutorials/build-todo-app.md' },
  { path: 'docs/tutorials/build-tic-tac-toe', title: 'Build Tic-Tac-Toe', file: 'docs/tutorials/build-tic-tac-toe.md' },
  { path: 'docs/tutorials/working-with-arrays', title: 'Working with Arrays', file: 'docs/tutorials/working-with-arrays.md' },

  // Examples
  { path: 'examples/comprehensive', title: 'Comprehensive Example', type: 'example' },
  { path: 'examples/todo', title: 'Todo App Example', type: 'example' },
  { path: 'examples/tic-tac-toe', title: 'Tic Tac Toe Example', type: 'example' },
  { path: 'examples/form-heavy', title: 'Form Handling Example', type: 'example' },
  { path: 'examples/repeat-test', title: 'List Rendering Example', type: 'example' },
  { path: 'examples/linkedin-puzzle', title: 'LinkedIn Zip Puzzle', type: 'external', url: 'https://sathvikc.github.io/linkedin-zip-puzzle/' },

  // API: Core
  { path: 'docs/api/core/state', title: 'state()', file: 'docs/api/core/state.md' },
  { path: 'docs/api/core/bindDom', title: 'bindDom()', file: 'docs/api/core/bindDom.md' },
  { path: 'docs/api/core/effect', title: 'effect()', file: 'docs/api/core/effect.md' },
  { path: 'docs/api/core/isReactive', title: 'isReactive()', file: 'docs/api/core/isReactive.md' },

  // API: Addons
  { path: 'docs/api/addons/computed', title: 'computed()', file: 'docs/api/addons/computed.md' },
  { path: 'docs/api/addons/repeat', title: 'repeat()', file: 'docs/api/addons/repeat.md' },
  { path: 'docs/api/addons/watch', title: 'watch()', file: 'docs/api/addons/watch.md' },

  // Guides
  { path: 'docs/guides', title: 'Guides', file: 'docs/guides/README.md' },
  { path: 'docs/guides/animations', title: 'Animations', file: 'docs/guides/animations.md' },
  { path: 'docs/guides/forms', title: 'Forms', file: 'docs/guides/forms.md' },
  { path: 'docs/guides/performance', title: 'Performance', file: 'docs/guides/performance.md' },
  { path: 'docs/guides/routing', title: 'Routing', file: 'docs/guides/routing.md' },
  { path: 'docs/guides/testing', title: 'Testing', file: 'docs/guides/testing.md' },

  // Design
  { path: 'docs/design/design-decisions', title: 'Design Decisions', file: 'docs/design/design-decisions.md' },
];

// --- Store Setup ---
const store = state({
  currentPath: window.location.hash.slice(1) || '',
  theme: 'dark',
  siteMap: SITE_MAP,

  // Docs state
  markdownContent: '',
  loading: false,
  error: false,
  prevPage: null,
  nextPage: null,

  // Store methods (functions in state are NOT proxied - no performance penalty)
  // This pattern keeps related logic cohesive and provides better ergonomics
  getCurrentEntry() {
    return this.siteMap.find(e => e.path === this.currentPath);
  },

  isExample() {
    const entry = this.getCurrentEntry();
    return isExampleType(entry?.type) || this.currentPath.startsWith('examples/');
  },

  isDocs() {
    const entry = this.getCurrentEntry();
    return (entry && !entry.type) || this.currentPath.startsWith('docs/');
  },

  updatePagination() {
    const currentIndex = this.siteMap.findIndex(d => d.path === this.currentPath);
    if (currentIndex !== -1) {
      this.prevPage = currentIndex > 0 ? this.siteMap[currentIndex - 1] : null;
      this.nextPage = currentIndex < this.siteMap.length - 1 ? this.siteMap[currentIndex + 1] : null;
    } else {
      this.prevPage = null;
      this.nextPage = null;
    }
  }
});

// Expose store for inline handlers (debugging only)
window.store = store;

// --- Routing Logic ---
const handleHashChange = (e) => {
  const hash = window.location.hash.slice(1);
  store.currentPath = hash;

  // Only scroll to top if it's a navigation event, not initial load
  if (e) {
    window.scrollTo(0, 0);
  }
};

window.addEventListener('hashchange', handleHashChange);

watch(store, 'currentPath', (newPath) => {
  // Update pagination
  store.updatePagination();

  // Fetch docs if needed
  if (newPath.startsWith('docs')) {
    loadDocs(newPath);
  }
});

async function loadDocs(path) {
  store.loading = true;
  store.error = false;

  try {
    const docEntry = store.siteMap.find(d => d.path === path);

    if (!docEntry || !docEntry.file) {
      throw new Error('Doc not found');
    }

    const fileToFetch = getBaseUrl() + docEntry.file;
    const res = await fetch(fileToFetch);
    
    if (!res.ok) throw new Error('Doc not found');

    store.markdownContent = await res.text();
  } catch (e) {
    console.error(e);
    store.error = true;
    store.markdownContent = '';
  } finally {
    store.loading = false;
  }
}

// --- Theme Logic with watch() ---
watch(store, 'theme', (theme) => {
  const html = document.documentElement;
  const lightStyle = document.getElementById('hljs-light');
  const darkStyle = document.getElementById('hljs-dark');

  if (theme === 'dark') {
    html.classList.add('dark');
    if (lightStyle) lightStyle.disabled = true;
    if (darkStyle) darkStyle.disabled = false;
  } else {
    html.classList.remove('dark');
    if (lightStyle) lightStyle.disabled = false;
    if (darkStyle) darkStyle.disabled = true;
  }

  localStorage.setItem('theme', theme);
});

// Initialize theme from localStorage
const savedTheme = localStorage.getItem('theme');
if (savedTheme) store.theme = savedTheme;

// --- Main App Component ---
function App() {
  // Call store methods - clean and cohesive API
  const currentEntry = store.getCurrentEntry();
  const isExamplePage = store.isExample();
  const isDocsPage = store.isDocs();

  return `
    <div class="min-h-screen bg-white dark:bg-gray-900 transition-colors duration-300">
      ${Header(store)}

      <main>
        ${(isDocsPage || isExamplePage) ? `
          <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div class="flex flex-col lg:flex-row">
              ${Sidebar(store)}
              <div class="flex-1 min-w-0 py-10 lg:pl-8">
                ${isExamplePage ? ExampleViewer(store, currentEntry) : DocsViewer(store)}
              </div>
            </div>
          </div>
        ` : `
          ${Hero()}
          ${Features()}
          ${Comparison()}
        `}
      </main>

      ${Footer()}
    </div>
  `;
}

// --- Mount ---
let cleanup;

// Use effect to re-render app on state changes
effect(() => {
  // Save sidebar scroll position to prevent jumping
  const sidebar = document.querySelector('aside');
  const scrollTop = sidebar ? sidebar.scrollTop : 0;

  if (cleanup) cleanup();

  const app = document.getElementById('app');
  app.innerHTML = App();

  // Bind any data-bind attributes (if used)
  cleanup = bindDom(app, store);

  // Restore sidebar scroll
  const newSidebar = document.querySelector('aside');
  if (newSidebar) newSidebar.scrollTop = scrollTop;

  // Apply syntax highlighting
  hljs.highlightAll();
});

// Initial load
handleHashChange();
