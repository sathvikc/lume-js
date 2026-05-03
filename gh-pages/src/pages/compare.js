export function renderCompare() {
  return `
    <section class="py-12 md:py-24 border-t-0">
      <div class="max-w-7xl mx-auto px-4 sm:px-6">
        <div class="mb-12 max-w-2xl">
          <div class="font-mono text-[11.5px] font-medium text-accent-fg uppercase tracking-[0.12em] mb-3">In context</div>
          <h2 class="font-serif font-normal leading-[1.1] tracking-[-0.02em] text-fg m-0 mb-3 text-balance" style="font-size:clamp(28px,4vw,44px)">A different kind of reactive.</h2>
          <p class="text-[17px] text-fg-muted m-0 text-pretty">Where Lume.js sits alongside other popular libraries — at a glance.</p>
        </div>
        <div class="border border-border rounded-2xl overflow-hidden bg-bg-raised overflow-x-auto">
          <table class="w-full border-collapse text-sm">
            <thead>
              <tr>
                <th class="px-5 py-4 text-left border-b border-border font-mono text-[11px] font-semibold text-fg-subtle uppercase tracking-widest bg-bg-sunken">Feature</th>
                <th class="px-5 py-4 text-left border-b border-border font-mono text-[11px] font-semibold text-fg-subtle uppercase tracking-widest bg-bg-sunken lume-col">Lume.js</th>
                <th class="px-5 py-4 text-left border-b border-border font-mono text-[11px] font-semibold text-fg-subtle uppercase tracking-widest bg-bg-sunken">Alpine.js</th>
                <th class="px-5 py-4 text-left border-b border-border font-mono text-[11px] font-semibold text-fg-subtle uppercase tracking-widest bg-bg-sunken">Vue</th>
                <th class="px-5 py-4 text-left border-b border-border font-mono text-[11px] font-semibold text-fg-subtle uppercase tracking-widest bg-bg-sunken">React</th>
              </tr>
            </thead>
            <tbody>
              <tr><td class="px-5 py-4 border-b border-border text-fg font-medium">Bundle size (gz)</td><td class="px-5 py-4 border-b border-border lume-col">~2.4 KB</td><td class="px-5 py-4 border-b border-border text-fg-muted">~15 KB</td><td class="px-5 py-4 border-b border-border text-fg-muted">~35 KB</td><td class="px-5 py-4 border-b border-border text-fg-muted">~45 KB</td></tr>
              <tr><td class="px-5 py-4 border-b border-border text-fg font-medium">Custom syntax</td><td class="px-5 py-4 border-b border-border lume-col">None</td><td class="px-5 py-4 border-b border-border text-fg-muted">x-data</td><td class="px-5 py-4 border-b border-border text-fg-muted">v-bind</td><td class="px-5 py-4 border-b border-border text-fg-muted">JSX</td></tr>
              <tr><td class="px-5 py-4 border-b border-border text-fg font-medium">Build step</td><td class="px-5 py-4 border-b border-border lume-col">Optional</td><td class="px-5 py-4 border-b border-border text-fg-muted">Optional</td><td class="px-5 py-4 border-b border-border text-fg-muted">Recommended</td><td class="px-5 py-4 border-b border-border text-fg-muted">Required</td></tr>
              <tr><td class="px-5 py-4 border-b border-border text-fg font-medium">Virtual DOM</td><td class="px-5 py-4 border-b border-border lume-col">No</td><td class="px-5 py-4 border-b border-border text-fg-muted">No</td><td class="px-5 py-4 border-b border-border text-fg-muted">Yes</td><td class="px-5 py-4 border-b border-border text-fg-muted">Yes</td></tr>
              <tr><td class="px-5 py-4 border-b border-border text-fg font-medium">HTML validation</td><td class="px-5 py-4 border-b border-border lume-col">Passes</td><td class="px-5 py-4 border-b border-border text-fg-muted">Warnings</td><td class="px-5 py-4 border-b border-border text-fg-muted">Warnings</td><td class="px-5 py-4 border-b border-border text-fg-muted">N/A</td></tr>
              <tr><td class="px-5 py-4 border-b border-border text-fg font-medium">Extensible handlers</td><td class="px-5 py-4 border-b border-border lume-col">Yes</td><td class="px-5 py-4 border-b border-border text-fg-muted">Built-in only</td><td class="px-5 py-4 border-b border-border text-fg-muted">Built-in only</td><td class="px-5 py-4 border-b border-border text-fg-muted">N/A</td></tr>
              <tr><td class="px-5 py-4 border-b border-border text-fg font-medium">Learning curve</td><td class="px-5 py-4 border-b border-border lume-col">Minutes</td><td class="px-5 py-4 border-b border-border text-fg-muted">Hours</td><td class="px-5 py-4 border-b border-border text-fg-muted">Days</td><td class="px-5 py-4 border-b border-border text-fg-muted">Weeks</td></tr>
              <tr><td class="px-5 py-4 text-fg font-medium">SSR support</td><td class="px-5 py-4 lume-col">Native</td><td class="px-5 py-4 text-fg-muted">Native</td><td class="px-5 py-4 text-fg-muted">Via framework</td><td class="px-5 py-4 text-fg-muted">Via framework</td></tr>
            </tbody>
          </table>
        </div>
        <p class="text-fg-muted text-sm mt-6 max-w-2xl">
          Lume is positioned between the "plain JavaScript" crowd and Alpine.js. It gives you reactivity without a custom template syntax — the cost is writing slightly more plumbing for things like loops. In exchange, your HTML stays vanilla, your editor works without plugins, and your bundle stays under 3 KB.
        </p>
      </div>
    </section>
  `;
}

export function renderNotFound() {
  return `
    <div class="max-w-7xl mx-auto px-4 sm:px-6 py-24 text-center">
      <div class="font-mono text-[11.5px] font-medium text-accent-fg uppercase tracking-[0.12em] mb-4">404</div>
      <h1 class="font-serif font-normal leading-[1.1] tracking-[-0.02em] text-fg mb-4 text-balance" style="font-size:clamp(28px,4vw,44px)">Page not found.</h1>
      <p class="text-[17px] text-fg-muted mx-auto mb-8 text-pretty">We couldn't find <code class="font-mono">${location.pathname}</code>.</p>
      <a class="inline-flex items-center justify-center gap-2 px-[18px] py-[13px] rounded-[14px] font-semibold text-sm bg-accent text-accent-contrast border border-transparent transition-all hover:brightness-[1.08] hover:-translate-y-px active:scale-[0.98] w-full sm:w-auto"
         href="/" data-link>Back to home</a>
    </div>
  `;
}
