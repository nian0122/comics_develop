import { defineConfig } from 'vite';

export default defineConfig({
    root: '.',
    base: '/',

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
        port: 3000,
        proxy: {
            '/api': {
                target: 'http://localhost:500',
                changeOrigin: true
            },
            '/hq_image': {
                target: 'http://localhost:500',
                changeOrigin: true
            },
            '/video': {
                target: 'http://localhost:500',
                changeOrigin: true
            }
        }
    },

    preview: {
        port: 4173,
        proxy: {
            '/api': {
                target: 'http://localhost:5000',
                changeOrigin: true
            }
        }
    }
});