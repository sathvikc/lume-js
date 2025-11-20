// vite.config.build.js - Configuration for building static examples
import { defineConfig } from "vite";
import { resolve } from "path";
import fs from "fs";

const projectRoot = resolve(__dirname);
const examplesPath = resolve(projectRoot, "examples");
const docsPath = resolve(projectRoot, "docs");

const exampleEntries = fs.readdirSync(examplesPath).filter((f) => {
    const full = resolve(examplesPath, f);
    return fs.statSync(full).isDirectory() && f !== 'node_modules';
});

// Build entries for both docs and examples
const input = {
    // Main docs page at root (empty string means root)
    main: resolve(docsPath, "index.html"),
    // Examples index
    'examples/index': resolve(examplesPath, "index.html"),
};

// Add each example
exampleEntries.forEach((entry) => {
    input[`examples/${entry}/index`] = resolve(examplesPath, `${entry}/index.html`);
});

const myResolverPlugin = () => {
    return {
        name: 'my-resolver-plugin',
        enforce: 'pre',
        resolveId(source, importer, options) {
            if (source === 'lume-js') {
                return resolve(projectRoot, 'src/index.js');
            }
            if (source === 'lume-js/addons') {
                return resolve(projectRoot, 'src/addons/index.js');
            }
            return null;
        }
    };
};

export default defineConfig({
    root: projectRoot,
    base: '/lume-js/', // Change this to your repo name
    build: {
        outDir: 'dist',
        emptyOutDir: true,
        rollupOptions: {
            input,
        },
    },
    plugins: [myResolverPlugin()],
});
