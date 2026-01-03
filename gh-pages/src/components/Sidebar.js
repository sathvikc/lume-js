export function Sidebar(store) {
  // Helper to check if a link is active
  const isActive = (path) => store.currentPath === path;

  // Helper to render a link
  const renderLink = (path, label, suffix = '') => `
    <a href="#${path}"
       class="flex items-center justify-between px-3 py-2 rounded-md text-sm font-medium transition-colors ${isActive(path)
      ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200'
    }">
      <span>${label}</span>
      ${suffix}
    </a>
  `;

  return `
    <aside class="hidden lg:block w-64 shrink-0 border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 h-[calc(100vh-4rem)] sticky top-16 overflow-y-auto">
      <nav class="p-4 space-y-8">
        <!-- Introduction -->
        <div>
          <h3 class="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
            Getting Started
          </h3>
          <div class="space-y-1">
            ${renderLink('docs/', 'Introduction')}
          </div>
        </div>

        <!-- Tutorials -->
        <div>
          <h3 class="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
            Tutorials
          </h3>
          <div class="space-y-1">
            ${renderLink('docs/tutorials/build-todo-app', 'Build Todo App')}
            ${renderLink('docs/tutorials/build-tic-tac-toe', 'Build Tic-Tac-Toe')}
            ${renderLink('docs/tutorials/working-with-arrays', 'Working with Arrays')}
          </div>
        </div>

        <!-- Examples -->
        <div>
          <h3 class="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
            Examples
          </h3>
          <div class="space-y-1">
            ${renderLink('examples/comprehensive', 'Comprehensive')}
            ${renderLink('examples/todo', 'Todo App')}
            ${renderLink('examples/tic-tac-toe', 'Tic Tac Toe')}
            ${renderLink('examples/form-heavy', 'Form Handling')}
            ${renderLink('examples/repeat-test', 'List Rendering')}
            ${renderLink('examples/linkedin-puzzle', 'LinkedIn Zip Puzzle')}
          </div>
        </div>

        <!-- API: Core -->
        <div>
          <h3 class="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
            API: Core
          </h3>
          <div class="space-y-1">
            ${renderLink('docs/api/core/state', 'state()')}
            ${renderLink('docs/api/core/bindDom', 'bindDom()')}
            ${renderLink('docs/api/core/effect', 'effect()')}
            ${renderLink('docs/api/core/isReactive', 'isReactive()')}
          </div>
        </div>

        <!-- API: Addons -->
        <div>
          <h3 class="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
            API: Addons
          </h3>
          <div class="space-y-1">
            ${renderLink('docs/api/addons/computed', 'computed()')}
            ${renderLink('docs/api/addons/repeat', 'repeat()', '<span title="Experimental" class="text-amber-500 dark:text-amber-400"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"></path></svg></span>')}
            ${renderLink('docs/api/addons/watch', 'watch()')}
          </div>
        </div>

        <!-- Guides -->
        <div>
          <h3 class="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
            Guides
          </h3>
          <div class="space-y-1">
            ${renderLink('docs/guides', 'Overview')}
            ${renderLink('docs/guides/animations', 'Animations')}
            ${renderLink('docs/guides/forms', 'Forms')}
            ${renderLink('docs/guides/performance', 'Performance')}
            ${renderLink('docs/guides/routing', 'Routing')}
            ${renderLink('docs/guides/testing', 'Testing')}
          </div>
        </div>

        <!-- Design -->
        <div>
          <h3 class="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
            Design
          </h3>
          <div class="space-y-1">
            ${renderLink('docs/design/design-decisions', 'Design Decisions')}
          </div>
        </div>
      </nav>
    </aside>
  `;
}
