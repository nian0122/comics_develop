import { defineConfig } from 'vitest/config';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
    plugins: [vue()],
    test: {
        globals: true,
        environment: 'jsdom',
        include: ['js/**/*.test.js', 'js/**/*.spec.js', 'src/**/*.test.js', 'src/**/*.spec.js'],
        exclude: ['node_modules', 'dist', 'coverage'],
        coverage: {
            provider: 'v8',
            reporter: ['text', 'html', 'lcov'],
            include: ['js/**/*.js', 'src/**/*.js', 'src/**/*.vue'],
            exclude: [
                'js/**/*.test.js',
                'js/**/*.spec.js',
                'js/tools-main.js',
                'js/**/index.js',
                'src/main.js'
            ]
        }
    }
});
