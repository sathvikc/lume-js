import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

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

console.log(`Using version: ${version}`);
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
      "lume-js":          "https://cdn.jsdelivr.net/npm/lume-js@${version}/src/index.js",
      "lume-js/addons":   "https://cdn.jsdelivr.net/npm/lume-js@${version}/src/addons/index.js",
      "lume-js/handlers": "https://cdn.jsdelivr.net/npm/lume-js@${version}/src/handlers/index.js"
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
