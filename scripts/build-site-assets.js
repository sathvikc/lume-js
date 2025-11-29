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

console.log('Injecting import maps...');
// Walk through examples and inject import map
// function injectImportMap(dir) {
//     const entries = fs.readdirSync(dir, { withFileTypes: true });
//     for (const entry of entries) {
//         const fullPath = path.join(dir, entry.name);
//         if (entry.isDirectory()) {
//             injectImportMap(fullPath);
//         } else if (entry.name === 'index.html') {
//             let content = fs.readFileSync(fullPath, 'utf-8');

//             // Check if import map already exists
//             if (!content.includes('<script type="importmap">')) {
//                 const importMap = `
//   <script type="importmap">
//     {
//       "imports": {
//         "lume-js": "https://cdn.jsdelivr.net/npm/lume-js/src/index.js",
//         "lume-js/addons": "https://cdn.jsdelivr.net/npm/lume-js/src/addons/index.js"
//       }
//     }
//   </script>
// `;
//                 // Insert before </head>
//                 content = content.replace('</head>', `${importMap}</head>`);
//                 fs.writeFileSync(fullPath, content);
//                 console.log(`Injected import map into ${fullPath}`);
//             }
//         }
//     }
// }

// injectImportMap(path.join(publicDir, 'examples'));
console.log('Done!');
