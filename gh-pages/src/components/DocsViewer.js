import hljs from 'highlight.js';
import { marked } from 'marked';

export function DocsViewer(store) {
  // If content is loading
  if (store.loading) {
    return `
      <div class="flex items-center justify-center min-h-[50vh]">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    `;
  }

  // If there's an error
  if (store.error) {
    return `
      <div class="flex flex-col items-center justify-center min-h-[50vh] text-center px-4">
        <div class="bg-red-50 dark:bg-red-900/20 p-4 rounded-full mb-4">
          <svg class="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
        </div>
        <h2 class="text-2xl font-bold text-gray-900 dark:text-white mb-2">Documentation Not Found</h2>
        <p class="text-gray-600 dark:text-gray-400 max-w-md mb-6">
          We couldn't find the page you're looking for. It might have been moved or deleted.
        </p>
        <a href="#docs/guide" class="text-blue-600 hover:text-blue-700 font-medium">
          Return to Introduction &rarr;
        </a>
      </div>
    `;
  }

  // Configure marked with highlight.js
  marked.setOptions({
    highlight: function (code, lang) {
      if (lang && hljs.getLanguage(lang)) {
        return hljs.highlight(code, { language: lang }).value;
      }
      return hljs.highlightAuto(code).value;
    }
  });

  // Render markdown conten
  const content = marked.parse(store.markdownContent || '');

  return `
    <div class="prose prose-blue dark:prose-invert max-w-none docs-content">
      ${content}
    </div>

    <!-- Pagination -->
    <div class="mt-16 pt-8 border-t border-gray-200 dark:border-gray-800 flex justify-between">
      ${store.prevPage ? `
        <a href="#${store.prevPage.path}" class="group flex flex-col">
          <span class="text-sm text-gray-500 dark:text-gray-400 mb-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">&larr; Previous</span>
          <span class="text-lg font-medium text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
            ${store.prevPage.title}
          </span>
        </a>
      ` : '<div></div>'}

      ${store.nextPage ? `
        <a href="#${store.nextPage.path}" class="group flex flex-col text-right">
          <span class="text-sm text-gray-500 dark:text-gray-400 mb-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">Next &rarr;</span>
          <span class="text-lg font-medium text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
            ${store.nextPage.title}
          </span>
        </a>
      ` : '<div></div>'}
    </div>
  `;
}
