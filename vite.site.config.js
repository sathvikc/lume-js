import fs from 'node:fs';
import { resolve } from 'node:path';
import { defineConfig } from 'vite';

const projectRoot = resolve(__dirname);
const packageJson = JSON.parse(fs.readFileSync(resolve(projectRoot, 'package.json'), 'utf-8'));
const version = packageJson.version;

function lumePlugin(version) {
  const metricsPath = resolve(projectRoot, 'gh-pages/src/data/metrics.json');
  let metrics = null;
  function loadMetrics() {
    if (!metrics && fs.existsSync(metricsPath)) {
      try { metrics = JSON.parse(fs.readFileSync(metricsPath, 'utf-8')); } catch {}
    }
    return metrics || { sizeKb: '2.x', testCount: '300+' };
  }
  return {
    name: 'lume-replacements',
    transform(code, id) {
      if (!id.includes('/gh-pages/') && !id.includes('/docs/') && !id.includes('/examples/')) return;
      const m = loadMetrics();
      let changed = false;
      if (code.includes('__LUME_VERSION__')) { code = code.replaceAll('__LUME_VERSION__', version); changed = true; }
      if (code.includes('__LUME_SIZE__')) { code = code.replaceAll('__LUME_SIZE__', m.sizeKb); changed = true; }
      if (code.includes('__LUME_TESTS__')) { code = code.replaceAll('__LUME_TESTS__', String(m.testCount)); changed = true; }
      if (changed) return code;
    },
    transformIndexHtml(html) {
      const m = loadMetrics();
      return html
        .replaceAll('__LUME_VERSION__', version)
        .replaceAll('__LUME_SIZE__', m.sizeKb)
        .replaceAll('__LUME_TESTS__', String(m.testCount));
    }
  };
}

// In build mode, intercept all lume-js imports and replace them with a virtual
// module that reads from window.Lume (set by the lume.global.js <script> tag).
// This removes the CDN module chain from the critical path — the global script
// loads in parallel with the site bundle instead of blocking it.
function lumeGlobalShimPlugin(command) {
  if (command === 'serve') return { name: 'lume-global-shim' };
  const LUME_IDS = new Set(['lume-js', 'lume-js/addons', 'lume-js/handlers']);
  const shim = `export const {
  state, bindDom, effect,
  watch, createCleanupGroup,
  show, classToggle, stringAttr,
} = window.Lume;`;
  return {
    name: 'lume-global-shim',
    enforce: 'pre',
    resolveId(id) { if (LUME_IDS.has(id)) return '\0lume-shim'; },
    load(id)      { if (id === '\0lume-shim') return shim; },
  };
}

export default defineConfig(({ command }) => ({
  root: resolve(projectRoot, 'gh-pages'),
  // '/' in dev so localhost:PORT/ works; '/lume-js/' in build for GitHub Pages
  base: command === 'build' ? '/lume-js/' : '/',
  css: {
    devSourcemap: true,
  },
  plugins: [lumePlugin(version), lumeGlobalShimPlugin(command)],
  resolve: {
    // Dev only: alias to local source so the site works without a CDN
    alias: command === 'serve' ? {
      'lume-js/addons':   resolve(projectRoot, 'src/addons/index.js'),
      'lume-js/handlers': resolve(projectRoot, 'src/handlers/index.js'),
      'lume-js':          resolve(projectRoot, 'src/index.js'),
    } : {},
  },
  build: {
    outDir: resolve(projectRoot, 'gh-pages/dist'),
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: resolve(projectRoot, 'gh-pages/index.html')
      },
      output: {
        // Split hljs into its own chunk so its hash is stable across site deploys.
        // Only invalidates when the highlight.js npm package version changes.
        manualChunks(id) {
          if (id.includes('highlight.js')) return 'hljs';
        }
      }
    }
  }
}));
