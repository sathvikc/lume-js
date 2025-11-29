import tailwindcss from '@tailwindcss/postcss';
import autoprefixer from 'autoprefixer';
import { resolve } from "path";
import { defineConfig } from "vite";

const projectRoot = resolve(__dirname);

export default defineConfig({
    plugins: [
        {
            name: 'redirect-missing-slash',
            configureServer(server) {
                server.middlewares.use((req, res, next) => {
                    if (req.url === '/lume-js') {
                        res.writeHead(301, { Location: '/lume-js/' });
                        res.end();
                        return;
                    }
                    next();
                });
            }
        }
    ],
    root: resolve(projectRoot, 'gh-pages'),
    base: '/lume-js/', // GitHub Pages repo name
    resolve: {
        alias: []
    },
    css: {
        postcss: {
            plugins: [
                tailwindcss(),
                autoprefixer()
            ]
        }
    },
    build: {
        outDir: resolve(projectRoot, 'gh-pages/dist'),
        emptyOutDir: true,
        rollupOptions: {
            input: {
                main: resolve(projectRoot, 'gh-pages/index.html')
            },
            external: ['lume-js', 'lume-js/addons']
        }
    }
});
