// Generate examples list for static build
import fs from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '..');
const examplesPath = resolve(projectRoot, 'examples');
const distPath = resolve(projectRoot, 'dist');

// Check if dist directory exists
if (!fs.existsSync(distPath)) {
  console.log('Dist directory does not exist yet. Skipping examples list generation.');
  process.exit(0);
}

const exampleEntries = fs.readdirSync(examplesPath).filter((f) => {
    const full = resolve(examplesPath, f);
    return fs.statSync(full).isDirectory() && f !== 'node_modules';
});

console.log('Examples found:', exampleEntries);

// Write to dist/examples folder
const outputPath = resolve(distPath, 'examples/__examples.json');

fs.mkdirSync(dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, JSON.stringify(exampleEntries, null, 2));

console.log('Generated:', outputPath);

// Copy .nojekyll to dist root
const nojekyllSource = resolve(projectRoot, '.nojekyll');
const nojekyllDest = resolve(distPath, '.nojekyll');
if (fs.existsSync(nojekyllSource)) {
  fs.copyFileSync(nojekyllSource, nojekyllDest);
  console.log('Copied .nojekyll to dist/');
}

// Move docs/index.html to root (main.html -> index.html)
const docsIndex = resolve(distPath, 'docs/index.html');
const rootIndex = resolve(distPath, 'index.html');
if (fs.existsSync(docsIndex)) {
  fs.copyFileSync(docsIndex, rootIndex);
  console.log('Moved docs/index.html to dist/index.html');
  // Optionally remove the docs folder if it only had index.html
  try {
    fs.rmSync(resolve(distPath, 'docs'), { recursive: true });
    console.log('Removed dist/docs/ folder');
  } catch (e) {
    // Ignore errors
  }
}
