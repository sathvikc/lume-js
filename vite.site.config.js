import fs from 'node:fs';
import { resolve } from 'node:path';
import { defineConfig } from 'vite';

const projectRoot = resolve(__dirname);
const packageJson = JSON.parse(fs.readFileSync(resolve(projectRoot, 'package.json'), 'utf-8'));
const version = packageJson.version;

export default defineConfig(({ command }) => ({
  root: resolve(projectRoot, 'gh-pages'),
  // '/' in dev so localhost:PORT/ works; '/lume-js/' in build for GitHub Pages
  base: command === 'build' ? '/lume-js/' : '/',
  css: {
    devSourcemap: true,
  },
  resolve: {
    alias: {
      'lume-js/addons':   `https://cdn.jsdelivr.net/npm/lume-js@${version}/src/addons/index.js`,
      'lume-js/handlers': `https://cdn.jsdelivr.net/npm/lume-js@${version}/src/handlers/index.js`,
      'lume-js':          `https://cdn.jsdelivr.net/npm/lume-js@${version}/src/index.js`,
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
