const EXAMPLES = [
  { id: 'comprehensive', title: 'Comprehensive demo', desc: 'Every feature of Lume in one page — state, effects, two-way binding, subscriptions.', tag: 'core' },
  { id: 'todo',          title: 'Todo app',            desc: 'Classic to-do list with add, complete, remove, and a computed remaining-count.', tag: 'tutorial' },
  { id: 'tic-tac-toe',   title: 'Tic-Tac-Toe',         desc: 'Turn logic, win detection, and a keyed repeat over the board.', tag: 'tutorial' },
  { id: 'form-heavy',    title: 'Form handling',       desc: 'Checkboxes, radios, textareas, selects — two-way bound with zero boilerplate.', tag: 'forms' },
  { id: 'repeat-test',   title: 'List rendering',      desc: 'Benchmark-friendly demo of the repeat addon.', tag: 'addon' },
  { id: 'handler-demo',  title: 'Handler system',      desc: 'Build a custom data-tooltip handler in five lines.', tag: 'handlers' },
];

export function renderExamples() {
  return `
    <section class="py-12 md:py-24 border-t-0">
      <div class="max-w-7xl mx-auto px-4 sm:px-6">
        <div class="mb-12 max-w-2xl">
          <div class="font-mono text-[11.5px] font-medium text-accent-fg uppercase tracking-[0.12em] mb-3">Examples</div>
          <h2 class="font-serif font-normal leading-[1.1] tracking-[-0.02em] text-fg m-0 mb-3 text-balance" style="font-size:clamp(28px,4vw,44px)">See it running.</h2>
          <p class="text-[17px] text-fg-muted m-0 text-pretty">Six worked examples — from a three-line counter to a full Tic-Tac-Toe with computed turn logic. Click a card to open the source.</p>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          ${EXAMPLES.map(e => `
            <a class="bg-bg-raised border border-border rounded-[10px] p-6 flex flex-col gap-3 transition-all cursor-pointer hover:border-accent/40 hover:-translate-y-0.5 hover:shadow-[0_8px_24px_-12px_color-mix(in_oklab,var(--accent)_30%,transparent)]"
               href="examples/${e.id}/index.html" target="_blank" rel="noopener">
              <span class="font-mono text-[10.5px] text-fg-subtle uppercase tracking-widest">${e.tag}</span>
              <h4 class="font-serif font-medium text-xl tracking-[-0.01em] m-0 text-fg">${e.title}</h4>
              <p class="m-0 text-fg-muted text-sm">${e.desc}</p>
              <div class="mt-auto pt-4 flex justify-between items-center font-mono text-xs text-accent-fg">
                <span>Open example</span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 5l7 7-7 7"/></svg>
              </div>
            </a>
          `).join('')}
        </div>
      </div>
    </section>
  `;
}
