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

export default defineConfig(({ command }) => ({
  root: resolve(projectRoot, 'gh-pages'),
  // '/' in dev so localhost:PORT/ works; '/lume-js/' in build for GitHub Pages
  base: command === 'build' ? '/lume-js/' : '/',
  css: {
    devSourcemap: true,
  },
  plugins: [lumePlugin(version)],
  resolve: {
    alias: command === 'serve' ? {
      'lume-js/addons':   resolve(projectRoot, 'src/addons/index.js'),
      'lume-js/handlers': resolve(projectRoot, 'src/handlers/index.js'),
      'lume-js':          resolve(projectRoot, 'src/index.js'),
    } : {
      'lume-js/addons':   `https://cdn.jsdelivr.net/npm/lume-js@${version}/dist/addons.min.mjs`,
      'lume-js/handlers': `https://cdn.jsdelivr.net/npm/lume-js@${version}/dist/handlers.min.mjs`,
      'lume-js':          `https://cdn.jsdelivr.net/npm/lume-js@${version}/dist/index.min.mjs`,
    }
  },
  build: {
    outDir: resolve(projectRoot, 'gh-pages/dist'),
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: resolve(projectRoot, 'gh-pages/index.html')
      },
      external: [
        'lume-js',
        'lume-js/addons',
        'lume-js/handlers',
        'highlight.js'
      ],
      output: {
        globals: {
          'highlight.js': 'hljs'
        }
      }
    }
  }
}));
