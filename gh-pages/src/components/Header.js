export function Header(store) {
  return `
    <header class="sticky top-0 z-30 w-full border-b bg-white/95 backdrop-blur dark:bg-gray-900/95 dark:border-gray-800 transition-colors duration-300">
      <div class="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        <div class="flex items-center gap-8">
          <a href="#" class="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400" onclick="window.location.hash=''">
            Lume.js
          </a>
          <nav class="hidden md:flex items-center gap-6 text-sm font-medium text-gray-600 dark:text-gray-300">
            <a href="#docs/" class="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">Docs</a>
            <a href="#examples/comprehensive" class="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">Examples</a>
            <a href="#docs/tutorials/build-todo-app" class="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">Tutorials</a>
          </nav>
        </div>

        <div class="flex items-center gap-4">
          <!-- Version Selector -->
          <!--
          <div class="relative group">
            <select id="version-select" onchange="if(this.value !== 'latest') alert('Version switching coming soon!')" class="appearance-none bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 text-xs rounded-full px-3 py-1.5 pr-8 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
              <option value="latest">v: latest</option>
              <option value="0.5.0">v: 0.5.0</option>
            </select>
            <div class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500">
              <svg class="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
            </div>
          </div>
          -->

          <!-- Dark Mode Toggle (Commented out for now) -->
          <!--
          <button id="theme-toggle" class="p-2 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 transition-colors rounded-full hover:bg-gray-100 dark:hover:bg-gray-800" aria-label="Toggle Dark Mode">
            <svg id="icon-sun" class="w-5 h-5 hidden dark:block" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"></path></svg>
            <svg id="icon-moon" class="w-5 h-5 block dark:hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"></path></svg>
          </button>
          -->

          <a href="https://github.com/sathvikc/lume-js" target="_blank" class="hidden sm:flex items-center gap-2 px-4 py-1.5 text-sm font-medium text-white bg-gray-900 dark:bg-white dark:text-gray-900 rounded-full hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors">
            <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
            <span>GitHub</span>
          </a>
        </div>
      </div>
    </header>
  `;
}
