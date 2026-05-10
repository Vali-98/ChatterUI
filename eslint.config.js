const { defineConfig } = require('eslint/config')
const expoConfig = require('eslint-config-expo/flat')
const i18nextPlugin = require('eslint-plugin-i18next').configs['flat/recommended']
const internalPlugin = require('eslint-plugin-internal')
const eslintPluginPrettierRecommended = require('eslint-plugin-prettier/recommended')
const reactCompilerPlugin = require('eslint-plugin-react-compiler')

const i18nRules = require('./eslint/i18n-settings')

module.exports = defineConfig([
    expoConfig,
    eslintPluginPrettierRecommended,
    i18nextPlugin,
    {
        ignores: ['dist/*'],
    },
    {
        files: ['**/*.{js,jsx,ts,tsx,d.ts}'],
        languageOptions: {
            parserOptions: {
                project: './tsconfig.json',
            },
        },
        plugins: {
            'react-compiler': reactCompilerPlugin,
            internal: internalPlugin,
        },
        rules: {
            'react-compiler/react-compiler': 'error',
            'prettier/prettier': [
                'warn',
                {
                    usePrettierrc: true,
                },
            ],
            radix: 'off',
            '@typescript-eslint/no-require-imports': 'off',
            'object-shorthand': ['warn', 'consistent'],
            'import/order': [
                'warn',
                {
                    alphabetize: { order: 'asc', caseInsensitive: true },
                    groups: [['builtin', 'external'], ['internal'], ['parent', 'sibling', 'index']],
                    'newlines-between': 'always',
                },
            ],
        },
    },
    {
        files: ['app/**/*.{tsx,ts}'],
        rules: {
            'i18next/no-literal-string': ['warn', i18nRules],
        },
    },
])
