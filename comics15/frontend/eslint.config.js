import globals from 'globals';
import pluginJs from '@eslint/js';

export default [
    {
        languageOptions: {
            globals: {
                ...globals.browser,
                ...globals.node
            }
        }
    },
    pluginJs.configs.recommended,
    {
        rules: {
            'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
            'no-console': 'off',
            'semi': ['error', 'always'],
            'quotes': ['error', 'single', { avoidEscape: true }],
            'no-var': 'error',
            'prefer-const': 'error',
            'object-shorthand': ['error', 'always'],
            'prefer-template': 'error'
        }
    },
    {
        ignores: ['dist/', 'node_modules/', 'coverage/']
    }
];