import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { gzip } from 'node:zlib';
import { readFile, readdir } from 'node:fs/promises';
import { minify } from 'terser';

const gzipAsync = promisify(gzip);

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const publicDir = path.resolve(rootDir, 'gh-pages/public');

// Ensure public dir exists
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// Helper to copy directory
function copyDir(src, dest) {
  if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) copyDir(srcPath, destPath);
    else fs.copyFileSync(srcPath, destPath);
  }
}

const packageJson = JSON.parse(fs.readFileSync(path.resolve(rootDir, 'package.json'), 'utf-8'));
const version = packageJson.version;

function replacePlaceholders(filePath) {
  let content = fs.readFileSync(filePath, 'utf-8');
  let changed = false;
  if (content.includes('__LUME_VERSION__')) { content = content.replaceAll('__LUME_VERSION__', version); changed = true; }
  if (content.includes('__LUME_SIZE__')) { content = content.replaceAll('__LUME_SIZE__', metrics.sizeKb); changed = true; }
  if (content.includes('__LUME_TESTS__')) { content = content.replaceAll('__LUME_TESTS__', String(metrics.testCount)); changed = true; }
  if (changed) {
    fs.writeFileSync(filePath, content);
    console.log(`Replaced placeholders: ${filePath}`);
  }
}

async function computeMetrics() {
  // Core gzipped size — read from the self-contained CDN build (dist/index.min.mjs).
  // This matches the badge in README and the budget enforced by check-size.js.
  // Requires `npm run build` to have run first; falls back to src/core/ scan if dist is missing.
  let sizeKb;
  const indexMinPath = path.join(rootDir, 'dist', 'index.min.mjs');
  if (fs.existsSync(indexMinPath)) {
    const content = await readFile(indexMinPath);
    const gz = await gzipAsync(content);
    sizeKb = (gz.length / 1024).toFixed(2);
  } else {
    const coreDir = path.join(rootDir, 'src', 'core');
    const coreFiles = [];
    async function scan(dir) {
      for (const entry of await readdir(dir, { withFileTypes: true })) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) await scan(fullPath);
        else if (entry.isFile() && path.extname(entry.name) === '.js') coreFiles.push(fullPath);
      }
    }
    await scan(coreDir);
    let totalGzipped = 0;
    for (const file of coreFiles) {
      const code = await readFile(file, 'utf-8');
      const minified = await minify(code, { compress: { passes: 2, unsafe: true, unsafe_comps: true, unsafe_methods: true }, mangle: { toplevel: true }, format: { comments: false } });
      totalGzipped += (await gzipAsync(Buffer.from(minified.code))).length;
    }
    sizeKb = (totalGzipped / 1024).toFixed(2);
  }

  // Test count
  let testCount = 0;
  async function countTests(dir) {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) await countTests(fullPath);
      else if (entry.isFile() && entry.name.endsWith('.test.js')) {
        const content = await readFile(fullPath, 'utf-8');
        // Count it('...') and test('...') calls
        const matches = content.match(/\bit\s*\(/g) || [];
        testCount += matches.length;
      }
    }
  }
  await countTests(path.join(rootDir, 'tests'));

  return { sizeKb, testCount };
}

console.log(`Using version: ${version}`);
console.log('Computing metrics...');
const metrics = await computeMetrics();
const metricsPath = path.join(rootDir, 'gh-pages/src/data/metrics.json');
fs.mkdirSync(path.dirname(metricsPath), { recursive: true });
fs.writeFileSync(metricsPath, JSON.stringify(metrics, null, 2));
console.log(`  Core size: ${metrics.sizeKb} KB gzipped`);
console.log(`  Tests: ${metrics.testCount}`);

console.log('Copying assets...');
copyDir(path.join(rootDir, 'docs'), path.join(publicDir, 'docs'));
copyDir(path.join(rootDir, 'examples'), path.join(publicDir, 'examples'));

// Copy 404.html into publicDir so Vite includes it in the dist output.
// GitHub Pages serves this file for any unmatched URL (history-mode SPA fallback).
fs.copyFileSync(
  path.resolve(rootDir, 'gh-pages/404.html'),
  path.join(publicDir, '404.html')
);
console.log('Copied 404.html to public/');

// Copy tracked static files (favicon, robots.txt, llms.txt) into publicDir.
const staticDir = path.resolve(rootDir, 'gh-pages/static');
if (fs.existsSync(staticDir)) {
  for (const entry of fs.readdirSync(staticDir, { withFileTypes: true })) {
    if (entry.isFile()) {
      fs.copyFileSync(path.join(staticDir, entry.name), path.join(publicDir, entry.name));
      console.log(`Copied static/${entry.name} to public/`);
    }
  }
}

// Replace placeholders in copied docs and examples
function replacePlaceholdersRecursive(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) replacePlaceholdersRecursive(fullPath);
    else replacePlaceholders(fullPath);
  }
}
replacePlaceholdersRecursive(path.join(publicDir, 'docs'));
replacePlaceholdersRecursive(path.join(publicDir, 'examples'));

// Inject import maps into examples/index.html files
function injectImportMap(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      injectImportMap(fullPath);
    } else if (entry.name === 'index.html') {
      let content = fs.readFileSync(fullPath, 'utf-8');
      if (!content.includes('<script type="importmap">')) {
        const importMap = `  <script type="importmap">
  {
    "imports": {
      "lume-js":          "https://cdn.jsdelivr.net/npm/lume-js@${version}/dist/index.min.mjs",
      "lume-js/addons":   "https://cdn.jsdelivr.net/npm/lume-js@${version}/dist/addons.min.mjs",
      "lume-js/handlers": "https://cdn.jsdelivr.net/npm/lume-js@${version}/dist/handlers.min.mjs"
    }
  }
  </script>
`;
        content = content.replace('</head>', `${importMap}</head>`);
        fs.writeFileSync(fullPath, content);
        console.log(`Injected import map: ${fullPath}`);
      }
    }
  }
}

injectImportMap(path.join(publicDir, 'examples'));
console.log('Done!');
