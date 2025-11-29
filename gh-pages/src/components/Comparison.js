export function Comparison() {
  return `
    <section class="py-24 bg-white dark:bg-gray-900">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="text-center mb-16">
          <h2 class="text-3xl font-bold text-gray-900 dark:text-white mb-4">How it Compares</h2>
          <p class="text-lg text-gray-600 dark:text-gray-300">See how Lume.js stacks up against other popular libraries.</p>
        </div>

        <div class="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
          <table class="w-full text-left border-collapse">
            <thead>
              <tr class="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700">
                <th class="py-5 px-6 text-sm font-bold text-gray-900 dark:text-white bg-gray-50/50 dark:bg-gray-800/20">Feature</th>
                <th class="py-5 px-6 text-sm font-bold text-blue-600 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-900/20 border-l border-r border-blue-100 dark:border-blue-800">Lume.js</th>
                <th class="py-5 px-6 text-sm font-bold text-gray-700 dark:text-gray-200">Alpine.js</th>
                <th class="py-5 px-6 text-sm font-bold text-gray-700 dark:text-gray-200">Preact</th>
                <th class="py-5 px-6 text-sm font-bold text-gray-700 dark:text-gray-200">React</th>
              </tr>
            </thead>
            <tbody class="text-sm divide-y divide-gray-100 dark:divide-gray-800">
              <tr class="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                <td class="py-4 px-6 font-medium text-gray-900 dark:text-gray-100 bg-gray-50/50 dark:bg-gray-800/20">Size (gzipped)</td>
                <td class="py-4 px-6 font-bold text-blue-600 dark:text-blue-400 bg-blue-50/30 dark:bg-blue-900/10 border-l border-r border-blue-100 dark:border-blue-800">&lt; 2KB</td>
                <td class="py-4 px-6 text-gray-600 dark:text-gray-300">~7KB</td>
                <td class="py-4 px-6 text-gray-600 dark:text-gray-300">~4KB</td>
                <td class="py-4 px-6 text-gray-600 dark:text-gray-300">~40KB</td>
              </tr>
              <tr class="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                <td class="py-4 px-6 font-medium text-gray-900 dark:text-gray-100 bg-gray-50/50 dark:bg-gray-800/20">Virtual DOM</td>
                <td class="py-4 px-6 font-bold text-green-600 dark:text-green-400 bg-blue-50/30 dark:bg-blue-900/10 border-l border-r border-blue-100 dark:border-blue-800">No</td>
                <td class="py-4 px-6 text-gray-600 dark:text-gray-300">No</td>
                <td class="py-4 px-6 text-gray-600 dark:text-gray-300">Yes</td>
                <td class="py-4 px-6 text-gray-600 dark:text-gray-300">Yes</td>
              </tr>
              <tr class="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                <td class="py-4 px-6 font-medium text-gray-900 dark:text-gray-100 bg-gray-50/50 dark:bg-gray-800/20">Reactivity</td>
                <td class="py-4 px-6 font-bold text-blue-600 dark:text-blue-400 bg-blue-50/30 dark:bg-blue-900/10 border-l border-r border-blue-100 dark:border-blue-800">Proxy-based</td>
                <td class="py-4 px-6 text-gray-600 dark:text-gray-300">Proxy-based</td>
                <td class="py-4 px-6 text-gray-600 dark:text-gray-300">Signals/Hooks</td>
                <td class="py-4 px-6 text-gray-600 dark:text-gray-300">Hooks</td>
              </tr>
              <tr class="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                <td class="py-4 px-6 font-medium text-gray-900 dark:text-gray-100 bg-gray-50/50 dark:bg-gray-800/20">Custom Syntax</td>
                <td class="py-4 px-6 font-bold text-green-600 dark:text-green-400 bg-blue-50/30 dark:bg-blue-900/10 border-l border-r border-blue-100 dark:border-blue-800">None</td>
                <td class="py-4 px-6 text-gray-600 dark:text-gray-300">Directives</td>
                <td class="py-4 px-6 text-gray-600 dark:text-gray-300">JSX</td>
                <td class="py-4 px-6 text-gray-600 dark:text-gray-300">JSX</td>
              </tr>
              <tr class="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                <td class="py-4 px-6 font-medium text-gray-900 dark:text-gray-100 bg-gray-50/50 dark:bg-gray-800/20">Build Step</td>
                <td class="py-4 px-6 font-bold text-green-600 dark:text-green-400 bg-blue-50/30 dark:bg-blue-900/10 border-l border-r border-blue-100 dark:border-blue-800">None</td>
                <td class="py-4 px-6 text-gray-600 dark:text-gray-300">None</td>
                <td class="py-4 px-6 text-gray-600 dark:text-gray-300">Required</td>
                <td class="py-4 px-6 text-gray-600 dark:text-gray-300">Required</td>
              </tr>
              <tr class="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                <td class="py-4 px-6 font-medium text-gray-900 dark:text-gray-100 bg-gray-50/50 dark:bg-gray-800/20">HTML Validation</td>
                <td class="py-4 px-6 font-bold text-green-600 dark:text-green-400 bg-blue-50/30 dark:bg-blue-900/10 border-l border-r border-blue-100 dark:border-blue-800">100% Valid</td>
                <td class="py-4 px-6 text-gray-600 dark:text-gray-300">Invalid</td>
                <td class="py-4 px-6 text-gray-600 dark:text-gray-300">N/A</td>
                <td class="py-4 px-6 text-gray-600 dark:text-gray-300">N/A</td>
              </tr>
              <tr class="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                <td class="py-4 px-6 font-medium text-gray-900 dark:text-gray-100 bg-gray-50/50 dark:bg-gray-800/20">Learning Curve</td>
                <td class="py-4 px-6 font-bold text-green-600 dark:text-green-400 bg-blue-50/30 dark:bg-blue-900/10 border-l border-r border-blue-100 dark:border-blue-800">Low</td>
                <td class="py-4 px-6 text-gray-600 dark:text-gray-300">Low</td>
                <td class="py-4 px-6 text-gray-600 dark:text-gray-300">Medium</td>
                <td class="py-4 px-6 text-gray-600 dark:text-gray-300">High</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </section>
  `;
}
