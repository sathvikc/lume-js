#!/usr/bin/env node

/**
 * Lume.js Build Script
 *
 * Produces production-ready minified bundles:
 *
 *   dist/
 *     index.mjs          — ESM core  (state, bindDom, effect, isReactive)
 *     addons.mjs         — ESM addons (computed, watch, repeat, debug, …)
 *     handlers.mjs       — ESM handlers (show, classToggle, boolAttr, …)
 *     shared-*.mjs       — shared code extracted by Rollup (automatic)
 *     lume.global.js     — IIFE all-in-one for <script> / CDN
 *     *.map              — sourcemaps
 *
 * Usage:
 *   node scripts/build.js
 *   npm run build
 */

import { build } from 'vite';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readdir, stat } from 'node:fs/promises';
import { gzip } from 'node:zlib';
import { promisify } from 'node:util';
import { readFile } from 'node:fs/promises';

const gzipAsync = promisify(gzip);
const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

const terserOptions = {
  compress: {
    passes: 2,
    unsafe: true,
    unsafe_comps: true,
    unsafe_methods: true,
  },
  mangle: {
    toplevel: true,
  },
  format: {
    comments: false,
  },
};

// ── Step 1: ESM library bundles ─────────────────────────────────────────────
console.log('\n📦 Building ESM bundles…\n');

await build({
  root,
  configFile: false,
  build: {
    lib: {
      entry: {
        index: resolve(root, 'src/index.js'),
        addons: resolve(root, 'src/addons/index.js'),
        handlers: resolve(root, 'src/handlers/index.js'),
      },
      formats: ['es'],
      fileName: (_format, entryName) => `${entryName}.mjs`,
    },
    outDir: 'dist',
    emptyOutDir: true,
    minify: 'terser',
    terserOptions,
    sourcemap: true,
    rollupOptions: {
      output: {
        chunkFileNames: 'shared-[hash].mjs',
      },
    },
  },
});

// ── Step 2: IIFE all-in-one bundle ──────────────────────────────────────────
console.log('\n📦 Building IIFE (global) bundle…\n');

await build({
  root,
  configFile: false,
  build: {
    lib: {
      entry: resolve(root, 'src/all.js'),
      name: 'Lume',
      formats: ['iife'],
      fileName: () => 'lume.global.js',
    },
    outDir: 'dist',
    emptyOutDir: false,
    minify: 'terser',
    terserOptions: {
      ...terserOptions,
      mangle: {
        toplevel: false,   // preserve the global `Lume` variable name
      },
    },
    sourcemap: true,
  },
});

// ── Step 3: Report sizes ────────────────────────────────────────────────────
console.log('\n📊 Bundle sizes:\n');

const distDir = resolve(root, 'dist');
const files = (await readdir(distDir)).filter(
  (f) => f.endsWith('.mjs') || (f.endsWith('.js') && !f.endsWith('.map'))
);

let totalRaw = 0;
let totalGz = 0;

for (const file of files.sort()) {
  const content = await readFile(resolve(distDir, file));
  const gzipped = await gzipAsync(content);
  const rawKB = (content.length / 1024).toFixed(2);
  const gzKB = (gzipped.length / 1024).toFixed(2);
  totalRaw += content.length;
  totalGz += gzipped.length;
  console.log(`  ${file.padEnd(24)} ${rawKB.padStart(7)} KB  →  ${gzKB.padStart(7)} KB gz`);
}

console.log('  ─'.padEnd(52, '─'));
console.log(
  `  ${'Total'.padEnd(24)} ${(totalRaw / 1024).toFixed(2).padStart(7)} KB  →  ${(totalGz / 1024).toFixed(2).padStart(7)} KB gz`
);
console.log('\n✅ Build complete.\n');
