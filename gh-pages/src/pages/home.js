export function renderHome() {
  return `
    <section class="relative overflow-hidden pt-10 md:pt-20 pb-16">
      <div class="hero-glow" aria-hidden="true"></div>
      <div class="max-w-7xl mx-auto px-4 sm:px-6">
        <span class="inline-flex items-center gap-2 font-mono text-xs font-medium text-accent-fg bg-accent-soft px-2.5 py-1 rounded-full border border-accent/30">
          <span class="w-1.5 h-1.5 rounded-full bg-accent animate-pulse-dot"></span>
          v__LUME_VERSION__ · now with extensible handlers
        </span>
        <h1 class="hero-title font-serif font-normal leading-[1.1] tracking-[-0.02em] text-fg mt-6 mb-5 text-balance"
            style="font-size: clamp(34px, 10vw, 78px)">
          Reactivity that<br/>follows <em>web standards</em>.
        </h1>
        <p class="text-[19px] text-fg-muted max-w-2xl leading-[1.55] text-pretty mb-8">
          Lume.js is a minimal reactive state library. It binds plain JavaScript objects to ordinary HTML using <code class="font-mono">data-*</code> attributes — no custom syntax, no compiler, no virtual DOM. __LUME_SIZE__&#8239;KB, shipped.
        </p>
        <div class="flex flex-col sm:flex-row gap-3 mb-10 items-stretch sm:items-center">
          <a class="inline-flex items-center justify-center gap-2 px-[18px] py-[13px] rounded-[14px] font-semibold text-sm border border-transparent cursor-pointer transition-all bg-accent text-accent-contrast shadow-[0_6px_18px_-8px_color-mix(in_oklab,var(--accent)_70%,transparent)] hover:brightness-[1.08] hover:-translate-y-px active:scale-[0.98] w-full sm:w-auto"
             href="/docs/introduction" data-link>
            Read the docs
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 5l7 7-7 7"/></svg>
          </a>
          <button class="inline-flex items-center justify-center gap-2 px-[18px] py-[13px] rounded-[14px] font-medium text-sm border border-border cursor-pointer transition-all bg-bg-raised text-fg hover:border-border-strong hover:bg-bg-sunken active:scale-[0.98] w-full sm:w-auto"
                  onclick="copyToClipboard('npm i lume-js', this)">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
            <code class="font-mono text-[12.5px] opacity-80 pointer-events-none">npm i lume-js</code>
          </button>
        </div>
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-8 pt-6 border-t border-dashed border-border mt-4">
          <div><div class="font-serif font-medium text-[28px] leading-none text-fg tracking-[-0.02em]">__LUME_SIZE__<span class="text-base">kb</span></div><div class="font-mono text-[11px] text-fg-subtle uppercase tracking-widest mt-1.5">Core gzipped</div></div>
          <div><div class="font-serif font-medium text-[28px] leading-none text-fg tracking-[-0.02em]">__LUME_TESTS__</div><div class="font-mono text-[11px] text-fg-subtle uppercase tracking-widest mt-1.5">Tests passing</div></div>
          <div><div class="font-serif font-medium text-[28px] leading-none text-fg tracking-[-0.02em]">0</div><div class="font-mono text-[11px] text-fg-subtle uppercase tracking-widest mt-1.5">Dependencies</div></div>
          <div><div class="font-serif font-medium text-[28px] leading-none text-fg tracking-[-0.02em]">100%</div><div class="font-mono text-[11px] text-fg-subtle uppercase tracking-widest mt-1.5">Valid HTML</div></div>
        </div>
        <div class="mt-8 md:mt-12 grid grid-cols-1 md:grid-cols-2 gap-5 items-stretch">
          <div class="bg-bg-raised border border-border rounded-2xl overflow-hidden flex flex-col">
            <div class="flex items-center gap-2.5 px-3.5 py-2.5 border-b border-border bg-bg-sunken">
              <span class="flex gap-1.5">
                <span class="w-2.5 h-2.5 rounded-full" style="background:color-mix(in oklab,var(--fg-subtle) 40%,transparent)"></span>
                <span class="w-2.5 h-2.5 rounded-full" style="background:color-mix(in oklab,var(--fg-subtle) 40%,transparent)"></span>
                <span class="w-2.5 h-2.5 rounded-full" style="background:color-mix(in oklab,var(--fg-subtle) 40%,transparent)"></span>
              </span>
              <span class="font-mono text-[11.5px] text-fg-subtle ml-1">index.html</span>
              <span class="ml-auto font-mono text-[10.5px] text-accent-fg bg-accent-soft px-2 py-0.5 rounded-full inline-flex items-center gap-1 before:content-[''] before:w-1.5 before:h-1.5 before:rounded-full before:bg-success">live</span>
            </div>
<pre class="m-0 px-5 py-4 bg-bg-code text-fg font-mono text-[13px] leading-[1.65] overflow-x-auto flex-1"><code class="language-html">&lt;h1&gt;Hello, &lt;span data-bind="name"&gt;&lt;/span&gt;!&lt;/h1&gt;
&lt;input data-bind="name" placeholder="Your name"&gt;

&lt;div class="counter"&gt;
  &lt;button onclick="store.count--"&gt;−&lt;/button&gt;
  &lt;span data-bind="count"&gt;&lt;/span&gt;
  &lt;button onclick="store.count++"&gt;+&lt;/button&gt;
&lt;/div&gt;
&lt;p&gt;Count is &lt;span data-bind="parity"&gt;&lt;/span&gt;&lt;/p&gt;

&lt;script type="module"&gt;
  import { state, bindDom } from 'lume-js';
  import { watch } from 'lume-js/addons';

  const store = state({ count: 0, name: 'World', parity: 'even' });
  watch(store, 'count', n =&gt; store.parity = n % 2 === 0 ? 'even' : 'odd');
  bindDom(document.body, store);
&lt;/script&gt;</code></pre>
          </div>
          <div class="bg-bg-raised border border-border rounded-2xl overflow-hidden flex flex-col">
            <div class="flex items-center gap-2.5 px-3.5 py-2.5 border-b border-border bg-bg-sunken">
              <span class="font-mono text-[11.5px] text-fg-subtle">live preview</span>
              <span class="ml-auto font-mono text-[10.5px] text-accent-fg bg-accent-soft px-2 py-0.5 rounded-full inline-flex items-center gap-1 before:content-[''] before:w-1.5 before:h-1.5 before:rounded-full before:bg-success">running</span>
            </div>
            <div id="demo-root" class="bg-bg-code text-fg p-8 flex-1 flex flex-col gap-6 justify-center transition-colors">
              <h2 class="font-serif font-medium text-[34px] leading-[1.1] tracking-[-0.02em] m-0 text-fg">Hello, <span class="text-accent-fg" data-bind="name">World</span>.</h2>
              <div>
                <label class="block font-mono text-[10.5px] text-fg-subtle uppercase tracking-widest mb-1.5">Your name</label>
                <input type="text" data-bind="name" placeholder="Type here…"
                       class="w-full px-3.5 py-2.5 bg-bg-raised text-fg border border-border rounded-lg font-sans text-sm outline-none transition-all focus:border-accent focus:shadow-[0_0_0_3px_color-mix(in_oklab,var(--accent)_20%,transparent)]">
              </div>
              <div>
                <label class="block font-mono text-[10.5px] text-fg-subtle uppercase tracking-widest mb-1.5">Counter</label>
                <div class="flex items-stretch gap-2">
                  <button aria-label="decrement" onclick="demoStore.count--"
                          class="w-11 h-11 rounded-lg border border-border bg-bg-raised text-fg text-lg cursor-pointer flex items-center justify-center transition-all hover:border-accent hover:text-accent-fg font-sans">−</button>
                  <div class="value flex-1 flex items-center justify-center bg-bg-raised border border-border rounded-lg font-mono font-bold text-[22px] text-fg" data-bind="count">0</div>
                  <button aria-label="increment" onclick="demoStore.count++"
                          class="w-11 h-11 rounded-lg border border-border bg-bg-raised text-fg text-lg cursor-pointer flex items-center justify-center transition-all hover:border-accent hover:text-accent-fg font-sans">+</button>
                </div>
              </div>
              <div class="flex items-center gap-2 font-mono text-[11px] text-fg-subtle uppercase tracking-widest">
                <span>Parity</span>
                <span class="tag px-2 py-0.5 rounded-full bg-bg-raised border border-border text-[10.5px] text-fg-muted" data-class-is-even="isEven" data-bind="parity"></span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section class="py-24 border-t border-border">
      <div class="max-w-7xl mx-auto px-4 sm:px-6">
        <div class="mb-12 max-w-2xl">
          <div class="font-mono text-[11.5px] font-medium text-accent-fg uppercase tracking-[0.12em] mb-3">Principles</div>
          <h2 class="font-serif font-normal leading-[1.1] tracking-[-0.02em] text-fg m-0 mb-3 text-balance" style="font-size:clamp(28px,4vw,44px)">Small surface. Large leverage.</h2>
          <p class="text-[17px] text-fg-muted m-0 text-pretty">Six ideas carry the whole library. Everything else is your code.</p>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 border border-border rounded-2xl overflow-hidden">
          <div class="p-8 border-r border-b border-border bg-bg-raised sm:last:border-r-0 lg:[&:nth-child(3n)]:border-r-0 [&:nth-last-child(-n+1)]:border-b-0 sm:[&:nth-last-child(-n+2)]:border-b-0 lg:[&:nth-last-child(-n+3)]:border-b-0">
            <div class="font-mono text-[11px] text-fg-subtle mb-5 tracking-[0.05em]">01</div>
            <h3 class="font-serif font-medium text-[22px] leading-[1.2] tracking-[-0.01em] m-0 mb-3 text-fg">Just standards</h3>
            <p class="m-0 text-fg-muted text-[14.5px] leading-[1.6]">Reactivity lives on <code class="font-mono">data-*</code> attributes. Your HTML validates, your editor autocompletes, your tools don't need plugins.</p>
            <span class="inline-block font-mono text-[11.5px] text-accent-fg bg-accent-soft px-1.5 py-0.5 rounded mt-4">data-bind · data-hidden</span>
          </div>
          <div class="p-8 border-r border-b border-border bg-bg-raised sm:last:border-r-0 lg:[&:nth-child(3n)]:border-r-0 [&:nth-last-child(-n+1)]:border-b-0 sm:[&:nth-last-child(-n+2)]:border-b-0 lg:[&:nth-last-child(-n+3)]:border-b-0">
            <div class="font-mono text-[11px] text-fg-subtle mb-5 tracking-[0.05em]">02</div>
            <h3 class="font-serif font-medium text-[22px] leading-[1.2] tracking-[-0.01em] m-0 mb-3 text-fg">No virtual DOM</h3>
            <p class="m-0 text-fg-muted text-[14.5px] leading-[1.6]">Updates are surgical. A key changes, exactly the nodes that read it are patched — nothing else is diffed, cloned, or re-rendered.</p>
          </div>
          <div class="p-8 border-b border-border bg-bg-raised border-r-0 sm:border-r lg:border-r-0 [&:nth-last-child(-n+1)]:border-b-0 sm:[&:nth-last-child(-n+2)]:border-b-0 lg:[&:nth-last-child(-n+3)]:border-b-0">
            <div class="font-mono text-[11px] text-fg-subtle mb-5 tracking-[0.05em]">03</div>
            <h3 class="font-serif font-medium text-[22px] leading-[1.2] tracking-[-0.01em] m-0 mb-3 text-fg">Zero build step</h3>
            <p class="m-0 text-fg-muted text-[14.5px] leading-[1.6]">Drop a <code class="font-mono">&lt;script type="module"&gt;</code> into any HTML file and you're done. No bundler, no JSX, no transpile.</p>
          </div>
          <div class="p-8 border-r border-b border-border bg-bg-raised sm:last:border-r-0 lg:[&:nth-child(3n)]:border-r-0 [&:nth-last-child(-n+1)]:border-b-0 sm:[&:nth-last-child(-n+2)]:border-b-0 lg:[&:nth-last-child(-n+3)]:border-b-0">
            <div class="font-mono text-[11px] text-fg-subtle mb-5 tracking-[0.05em]">04</div>
            <h3 class="font-serif font-medium text-[22px] leading-[1.2] tracking-[-0.01em] m-0 mb-3 text-fg">Handler system</h3>
            <p class="m-0 text-fg-muted text-[14.5px] leading-[1.6]">Need <code class="font-mono">data-href</code>, <code class="font-mono">data-class-active</code>, or anything else? Write a nine-line plain object and pass it in.</p>
            <span class="inline-block font-mono text-[11.5px] text-accent-fg bg-accent-soft px-1.5 py-0.5 rounded mt-4">{ attr, apply }</span>
          </div>
          <div class="p-8 border-r border-b border-border bg-bg-raised sm:last:border-r-0 lg:[&:nth-child(3n)]:border-r-0 [&:nth-last-child(-n+1)]:border-b-0 sm:[&:nth-last-child(-n+2)]:border-b-0 lg:[&:nth-last-child(-n+3)]:border-b-0">
            <div class="font-mono text-[11px] text-fg-subtle mb-5 tracking-[0.05em]">05</div>
            <h3 class="font-serif font-medium text-[22px] leading-[1.2] tracking-[-0.01em] m-0 mb-3 text-fg">Tree-shakeable</h3>
            <p class="m-0 text-fg-muted text-[14.5px] leading-[1.6]">Import only what you need from <code class="font-mono">/handlers</code> and <code class="font-mono">/addons</code>. The core stays lean — under __LUME_SIZE__&#8239;KB gzipped.</p>
          </div>
          <div class="p-8 bg-bg-raised border-r-0 border-b-0">
            <div class="font-mono text-[11px] text-fg-subtle mb-5 tracking-[0.05em]">06</div>
            <h3 class="font-serif font-medium text-[22px] leading-[1.2] tracking-[-0.01em] m-0 mb-3 text-fg">Typed</h3>
            <p class="m-0 text-fg-muted text-[14.5px] leading-[1.6]">First-class <code class="font-mono">.d.ts</code> ships with the package. Plugins, handlers, and stores all type-check generically.</p>
          </div>
        </div>
      </div>
    </section>

    <section class="py-24 border-t border-border">
      <div class="max-w-7xl mx-auto px-4 sm:px-6">
        <div class="mb-12 max-w-2xl">
          <div class="font-mono text-[11.5px] font-medium text-accent-fg uppercase tracking-[0.12em] mb-3">Get started</div>
          <h2 class="font-serif font-normal leading-[1.1] tracking-[-0.02em] text-fg m-0 mb-3 text-balance" style="font-size:clamp(28px,4vw,44px)">Install in six seconds.</h2>
          <p class="text-[17px] text-fg-muted m-0 text-pretty">Pick the flow that fits your stack.</p>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div class="border border-border rounded-2xl bg-bg-raised p-8">
            <div class="font-mono text-[11px] text-fg-subtle uppercase tracking-widest">CDN · no build</div>
            <h3 class="font-serif font-medium text-[22px] tracking-[-0.01em] mt-1.5 mb-4">Drop into any HTML file</h3>
<pre class="m-0 px-4 py-3.5 bg-bg-code border border-border rounded-[10px] text-[13px] overflow-x-auto"><code class="language-html">&lt;script type="module"&gt;
  import { state, bindDom }
    from 'https://cdn.jsdelivr.net/npm/lume-js@__LUME_VERSION__/src/index.js';

  const store = state({ name: 'World' });
  bindDom(document.body, store);
&lt;/script&gt;</code></pre>
          </div>
          <div class="border border-border rounded-2xl bg-bg-raised p-8">
            <div class="font-mono text-[11px] text-fg-subtle uppercase tracking-widest">NPM · bundler</div>
            <h3 class="font-serif font-medium text-[22px] tracking-[-0.01em] mt-1.5 mb-4">Install with your package manager</h3>
<pre class="m-0 px-4 py-3.5 bg-bg-code border border-border rounded-[10px] text-[13px] overflow-x-auto"><code class="language-bash">npm install lume-js
# or pnpm add lume-js
# or yarn add lume-js</code></pre>
            <p class="text-fg-muted text-[13.5px] mt-3.5 mb-0">
              Ships ES modules, TypeScript types, and subpath exports for
              <code class="font-mono">/handlers</code> and <code class="font-mono">/addons</code>.
            </p>
          </div>
        </div>
      </div>
    </section>
  `;
}
