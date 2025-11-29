import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

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
    const entries = fs.readdirSync(src, { withFileTypes: true });

    for (const entry of entries) {
        const srcPath = path.join(src, entry.name);
        const destPath = path.join(dest, entry.name);

        if (entry.isDirectory()) {
            copyDir(srcPath, destPath);
        } else {
            fs.copyFileSync(srcPath, destPath);
        }
    }
}

console.log('Copying assets...');
copyDir(path.join(rootDir, 'docs'), path.join(publicDir, 'docs'));
copyDir(path.join(rootDir, 'examples'), path.join(publicDir, 'examples'));


console.log('Replacing lume-js imports with CDN URLs in example JS files...');
function replaceLumeJsImports(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            replaceLumeJsImports(fullPath);
        } else if (entry.name.endsWith('.js')) {
            let content = fs.readFileSync(fullPath, 'utf-8');
            // Replace lume-js/addons first to avoid partial match
            content = content.replace(/from ['"]lume-js\/addons['"]/g, 'from "https://cdn.jsdelivr.net/npm/lume-js/src/addons/index.js"');
            content = content.replace(/from ['"]lume-js['"]/g, 'from "https://cdn.jsdelivr.net/npm/lume-js/src/index.js"');
            fs.writeFileSync(fullPath, content);
        }
    }
}
replaceLumeJsImports(path.join(publicDir, 'examples'));
console.log('Done!');
