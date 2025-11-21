// vite.config.js
import { defineConfig } from "vite";
import { resolve } from "path";
import fs from "fs";

const projectRoot = resolve(__dirname);
const examplesPath = resolve(projectRoot, "examples");

const exampleEntries = fs.readdirSync(examplesPath).filter((f) => {
    const full = resolve(examplesPath, f);
    return fs.statSync(full).isDirectory() && f !== 'node_modules';
});

const input = {
    index: resolve(examplesPath, "index.html"),
};
exampleEntries.forEach((entry) => {
    input[entry] = resolve(examplesPath, `${entry}/index.html`);
});

// Simple resolver: map package-style imports to local source during dev
const lumeResolverPlugin = () => ({
    name: 'lume-resolver',
    enforce: 'pre',
    resolveId(source) {
        if (source === 'lume-js') return resolve(projectRoot, 'src/index.js');
        if (source === 'lume-js/addons') return resolve(projectRoot, 'src/addons/index.js');
        return null;
    }
});

export default defineConfig({
    root: projectRoot,
    server: {
        fs: {
            allow: [projectRoot],
        },
        open: '/examples/index.html',
    },
    build: {
        rollupOptions: {
            input,
        },
    },
    // The alias is now redundant, but leaving it here for clarity
    // resolve: {
    //     alias: {
    //         "lume-js": resolve(projectRoot, "src/index.js"),
    //         "lume-js/addons": resolve(projectRoot, "src/addons/index.js"),
    //     },
    // },
    plugins: [
        lumeResolverPlugin(),
    ],
});
