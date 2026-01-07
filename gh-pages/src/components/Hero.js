export function Hero() {
  return `
    <section class="relative pt-20 pb-32 overflow-hidden">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div class="text-center max-w-3xl mx-auto mb-16">
          <h1 class="text-5xl md:text-6xl font-extrabold tracking-tight text-gray-900 dark:text-white mb-6">
            The <span class="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400">Lightweight</span> Reactive Library
          </h1>
          <p class="text-xl text-gray-600 dark:text-gray-300 mb-8 leading-relaxed">
            Build fast, reactive web applications with zero dependencies. No Virtual DOM. Just pure performance.
          </p>

          <div class="flex flex-wrap justify-center gap-3 mb-10">
            <span class="px-3 py-1 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 text-sm font-semibold border border-blue-200 dark:border-blue-800">
              &lt; 2KB gzipped
            </span>
            <span class="px-3 py-1 rounded-full bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 text-sm font-semibold border border-green-200 dark:border-green-800">
              ES6+ Only
            </span>
            <span class="px-3 py-1 rounded-full bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300 text-sm font-semibold border border-purple-200 dark:border-purple-800">
              TypeScript Ready
            </span>
          </div>

          <div class="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a href="#docs/" class="w-full sm:w-auto px-8 py-3 text-base font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-lg hover:shadow-xl">
              Get Started
            </a>
            <a href="#examples/comprehensive" class="w-full sm:w-auto px-8 py-3 text-base font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors">
              View Examples
            </a>
          </div>
        </div>

        <!-- Quick Start Code Snippet -->
        <div class="max-w-5xl mx-auto grid md:grid-cols-2 gap-6 lg:gap-8 items-stretch">
          <!-- Code -->
          <div class="bg-gray-900 rounded-xl shadow-2xl overflow-hidden border border-gray-800 flex flex-col">
            <div class="flex items-center px-4 py-2 bg-gray-800 border-b border-gray-700">
              <div class="flex space-x-2">
                <div class="w-3 h-3 rounded-full bg-red-500"></div>
                <div class="w-3 h-3 rounded-full bg-yellow-500"></div>
                <div class="w-3 h-3 rounded-full bg-green-500"></div>
              </div>
              <div class="ml-4 text-xs text-gray-400 font-mono">index.html</div>
            </div>
            <div class="p-6 overflow-x-auto flex-1">
              <pre><code class="language-html text-sm">&lt;!-- 1. Define HTML Structure --&gt;
&lt;h1&gt;Hello, &lt;span data-bind="name"&gt;&lt;/span&gt;!&lt;/h1&gt;

&lt;input data-bind="name" placeholder="Enter name"&gt;

&lt;div class="counter"&gt;
  &lt;button onclick="store.count--"&gt;-&lt;/button&gt;
  &lt;span data-bind="count"&gt;&lt;/span&gt;
  &lt;button onclick="store.count++"&gt;+&lt;/button&gt;
&lt;/div&gt;

&lt;script type="module"&gt;
  import { state, bindDom } from 'lume-js';

  // 2. Create State & Bind
  const store = state({ count: 0, name: 'World' });
  bindDom(document.body, store);
&lt;/script&gt;</code></pre>
            </div>
          </div>          <!-- Live Demo -->
          <div class="bg-white dark:bg-gray-800 rounded-xl shadow-2xl overflow-hidden border border-gray-200 dark:border-gray-700 flex flex-col">
            <div class="flex items-center px-4 py-2 bg-gray-100 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
              <div class="text-xs text-gray-500 dark:text-gray-400 font-mono uppercase tracking-wider">Live Preview</div>
            </div>
            <div id="demo-container" class="p-8 flex flex-col justify-center flex-1 bg-[#0f172a] min-h-[300px]">
              <div class="w-full max-w-sm mx-auto space-y-8">

                <!-- Greeting -->
                <h2 class="text-4xl font-bold text-white tracking-tight">
                  Hello, <span data-bind="name" class="text-blue-400"></span>!
                </h2>

                <div class="space-y-6">
                  <!-- Name Input -->
                  <div class="space-y-2">
                    <label class="text-xs font-semibold text-gray-400 uppercase tracking-wider">Name</label>
                    <input type="text" data-bind="name"
                      class="w-full px-4 py-3 rounded-lg bg-[#1e293b] border border-gray-700 text-white placeholder-gray-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                      placeholder="Enter name">
                  </div>

                  <!-- Counter -->
                  <div class="space-y-2">
                    <label class="text-xs font-semibold text-gray-400 uppercase tracking-wider">Counter</label>
                    <div class="flex items-center gap-3">
                      <button onclick="demoStore.count--"
                        class="w-12 h-12 flex items-center justify-center rounded-lg bg-[#1e293b] border border-gray-700 text-gray-400 hover:text-white hover:border-gray-600 hover:bg-[#2d3b4e] transition-all active:scale-95">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 12H4"></path></svg>
                      </button>

                      <div class="flex-1 h-12 flex items-center justify-center bg-[#1e293b] border border-gray-700 rounded-lg">
                        <span data-bind="count" class="text-2xl font-bold text-white font-mono"></span>
                      </div>

                      <button onclick="demoStore.count++"
                        class="w-12 h-12 flex items-center justify-center rounded-lg bg-blue-600 text-white hover:bg-blue-500 shadow-lg shadow-blue-900/20 transition-all active:scale-95">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path></svg>
                      </button>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Background decoration -->
      <div class="absolute top-0 left-1/2 transform -translate-x-1/2 w-full h-full z-0 pointer-events-none">
        <div class="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl"></div>
        <div class="absolute bottom-0 right-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl"></div>
      </div>
    </section>
  `;
}
