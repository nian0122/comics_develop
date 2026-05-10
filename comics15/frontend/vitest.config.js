import { defineConfig } from 'vitest/config';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
    plugins: [vue()],
    test: {
        globals: true,
        environment: 'jsdom',
        include: ['src/**/*.test.js', 'src/**/*.spec.js'],
        exclude: ['node_modules', 'dist', 'coverage'],
        coverage: {
            provider: 'v8',
            reporter: ['text', 'html', 'lcov'],
            include: ['src/**/*.js', 'src/**/*.vue'],
            exclude: [
                'src/**/*.test.js',
                'src/**/*.spec.js',
                'src/main.js'
            ]
        }
    }
});
