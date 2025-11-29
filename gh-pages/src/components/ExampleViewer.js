export function ExampleViewer(store) {
  const path = store.currentPath; // e.g., 'examples/counter'
  const exampleId = path.split('/')[1];
  const baseUrl = import.meta.env.BASE_URL.endsWith('/') ? import.meta.env.BASE_URL : import.meta.env.BASE_URL + '/';
  const src = `${baseUrl}examples/${exampleId}/index.html`;

  return `
    <div class="max-w-full mx-auto">
      <div class="mb-8 flex items-center justify-between">
        <h2 class="text-3xl font-bold text-gray-900 dark:text-white capitalize">${exampleId.replace(/-/g, ' ')} Example</h2>
      </div>

      <div class="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden border border-gray-200 dark:border-gray-700">
        <div class="bg-gray-100 dark:bg-gray-900 px-4 py-2 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
          <span class="text-xs font-mono text-gray-500">Preview</span>
          <a href="${src}" target="_blank" class="text-xs text-blue-600 hover:underline">Open in new tab</a>
        </div>
        <iframe src="${src}" class="w-full h-[600px] border-0 bg-white" title="${exampleId} example"></iframe>
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
    </div>
  `;
}
