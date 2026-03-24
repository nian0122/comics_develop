import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        globals: true,
        environment: 'jsdom',
        include: ['js/**/*.test.js', 'js/**/*.spec.js'],
        exclude: ['node_modules', 'dist'],
        coverage: {
            provider: 'v8',
            reporter: ['text', 'html', 'lcov'],
            include: ['js/**/*.js'],
            exclude: [
                'js/**/*.test.js',
                'js/**/*.spec.js',
                'js/main.js'
            ]
        }
    }
});