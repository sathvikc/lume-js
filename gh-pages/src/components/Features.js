export function Features() {
    const features = [
        {
            title: "Ultra Lightweight",
            desc: "Less than 2KB gzipped. No bloat, just the essentials for building reactive apps.",
            icon: `<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>`
        },
        {
            title: "No Virtual DOM",
            desc: "Direct DOM manipulation for maximum performance. Updates are surgical and instant.",
            icon: `<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"></path></svg>`
        },
        {
            title: "Zero Dependencies",
            desc: "Standalone library with no external requirements. Drop it in and start coding.",
            icon: `<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path></svg>`
        },
        {
            title: "Simple API",
            desc: "Learn in minutes. Intuitive API design that stays out of your way.",
            icon: `<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"></path></svg>`
        }
    ];

    return `
    <section id="features" class="py-24 bg-gray-50 dark:bg-gray-800/50">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="text-center mb-16">
          <h2 class="text-3xl font-bold text-gray-900 dark:text-white mb-4">Why Lume.js?</h2>
          <p class="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            Designed for modern web development where performance and simplicity matter most.
          </p>
        </div>

        <div class="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          ${features.map(feature => `
            <div class="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm hover:shadow-md transition-shadow border border-gray-100 dark:border-gray-700">
              <div class="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg flex items-center justify-center mb-4">
                ${feature.icon}
              </div>
              <h3 class="text-xl font-semibold text-gray-900 dark:text-white mb-2">${feature.title}</h3>
              <p class="text-gray-600 dark:text-gray-400">${feature.desc}</p>
            </div>
          `).join('')}
        </div>
      </div>
    </section>
  `;
}
