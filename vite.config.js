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

const myResolverPlugin = () => {
    return {
        name: 'my-resolver-plugin',
        enforce: 'pre', // Run before all other plugins
        resolveId(source, importer, options) {
            if (source === 'lume-js') {
                return resolve(projectRoot, 'src/index.js');
            }
            if (source === 'lume-js/addons') {
                return resolve(projectRoot, 'src/addons/index.js');
            }
            return null; // Let other resolvers handle the rest
        }
    };
};

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
        myResolverPlugin(),
        {
            name: "examples-list",
            enforce: "pre",
            configureServer(server) {
                server.middlewares.use((req, res, next) => {
                    const cleanUrl = req.url.split("?");

                    if (cleanUrl[0] === "/__examples.json") {
                        res.setHeader('Content-Type', 'application/json');
                        res.end(JSON.stringify(exampleEntries));
                    } else {
                        next();
                    }
                });
            },
        },
    ],
});
