import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

const comicsRoot = process.env.COMICS_ROOT_DIR || 'F:/games/comics';
const hqSubDir = process.env.HQ_SUB_DIR || 'h_photograph';
const lqSubDir = process.env.LQ_SUB_DIR || 'l_photograph';
const backendTarget = 'http://localhost:500';
const frontendRoot = fileURLToPath(new URL('.', import.meta.url));
const devServerPort = Number.parseInt(process.env.VITE_DEV_PORT || '5173', 10);

function decodeUrlPath(url) {
    return decodeURIComponent((url || '').split('?')[0]);
}

function sendStaticFile(res, filePath, notFoundStatus) {
    fs.stat(filePath, (statError, stat) => {
        if (statError || !stat.isFile()) {
            res.statusCode = notFoundStatus;
            res.end();
            return;
        }

        res.setHeader('Content-Length', stat.size);
        fs.createReadStream(filePath).pipe(res);
    });
}

function serveComicStatic(prefix, subDir, notFoundStatus) {
    return (req, res, next) => {
        if (!req.url?.startsWith(prefix)) {
            next();
            return;
        }

        const relativePath = decodeUrlPath(req.url.slice(prefix.length)).replace(/^\/+/, '');
        const filePath = path.join(comicsRoot, subDir, relativePath);
        sendStaticFile(res, filePath, notFoundStatus);
    };
}

function comicStaticPlugin() {
    return {
        name: 'comic-static-dev-server',
        configureServer(server) {
            server.middlewares.use(serveComicStatic('/hq_image/', hqSubDir, 404));
            server.middlewares.use(serveComicStatic('/lq_image/', lqSubDir, 204));
            server.middlewares.use(serveComicStatic('/video/', hqSubDir, 404));
        }
    };
}

export default defineConfig({
    root: '.',
    base: '/',
    plugins: [vue(), comicStaticPlugin()],

    build: {
        outDir: 'dist',
        assetsDir: 'assets',
        sourcemap: true,
        minify: 'esbuild',
        rollupOptions: {
            input: {
                main: './index.html'
            }
        }
    },

    server: {
        host: '127.0.0.1',
        port: devServerPort,
        fs: {
            allow: [frontendRoot, comicsRoot]
        },
        proxy: {
            '/api': {
                target: backendTarget,
                changeOrigin: true
            }
        }
    },

    preview: {
        port: 4173,
        proxy: {
            '/api': {
                target: backendTarget,
                changeOrigin: true
            }
        }
    }
});
