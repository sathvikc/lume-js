import { build } from 'esbuild';
import { gzipSync } from 'zlib';
import { readFileSync, mkdirSync } from 'fs';

// Ensure dist directory exists
mkdirSync('dist', { recursive: true });

// Build minified bundle
await build({
  entryPoints: ['src/index.js'],
  bundle: true,
  minify: true,
  format: 'esm',
  outfile: 'dist/lume.min.js',
  logLevel: 'warning'
});

// Read and gzip
const code = readFileSync('dist/lume.min.js');
const gzipped = gzipSync(code);

// Report
console.log('\n📦 Lume.js Bundle Size Report\n');
console.log('  Minified:  ', (code.length / 1024).toFixed(2), 'KB');
console.log('  Gzipped:   ', (gzipped.length / 1024).toFixed(2), 'KB');
console.log('\n✅ Target: < 2KB gzipped\n');

// Check if under budget
if (gzipped.length / 1024 > 2) {
  console.error('❌ Bundle exceeds 2KB gzipped budget!');
  process.exit(1);
}