import js from '@eslint/js';
import tseslint from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';

export default [
    {
        ignores: ['**/dist'],
    },
    js.configs.recommended,
    ...tseslint.configs['flat/recommended'],
    {
        files: ['**/*.ts', '**/*.tsx'],
        languageOptions: {
            parser: tsParser,
            ecmaVersion: 2018,
            sourceType: 'module',
        },

        rules: {
            quotes: ['warn', 'single'],

            indent: ['warn', 4, {
                SwitchCase: 1,
            }],

            semi: ['warn', 'always'],
            'comma-dangle': ['warn', 'always-multiline'],
            'dot-notation': 'off',
            eqeqeq: 'warn',
            curly: ['warn', 'all'],
            'brace-style': ['warn'],
            'prefer-arrow-callback': ['warn'],
            'max-len': ['warn', 140],
            'no-console': ['warn'],
            'no-non-null-assertion': ['off'],
            'comma-spacing': ['error'],

            'no-multi-spaces': ['warn', {
                ignoreEOLComments: true,
            }],

            'lines-between-class-members': ['warn', 'always', {
                exceptAfterSingleLine: true,
            }],

            '@typescript-eslint/explicit-function-return-type': 'off',
            '@typescript-eslint/no-non-null-assertion': 'off',
            '@typescript-eslint/explicit-module-boundary-types': 'off',
            '@typescript-eslint/no-explicit-any': 'off',
        },
    },
];
