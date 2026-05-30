import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        globals: true,
        environment: 'jsdom',
        include: ['js/**/*.test.js', 'js/**/*.spec.js', 'src/**/*.test.js', 'src/**/*.spec.js', 'src/**/*.test.ts', 'src/**/*.spec.ts'],
        exclude: ['node_modules', 'dist', 'coverage'],
        coverage: {
            provider: 'v8',
            reporter: ['text', 'html', 'lcov'],
            include: ['js/**/*.js', 'src/**/*.js', 'src/**/*.vue'],
            exclude: [
                'js/**/*.test.js',
                'js/**/*.spec.js',
                'js/main.js',
                'js/tools-main.js',
                'js/**/index.js',
                'src/main.js'
            ]
        }
    }
});