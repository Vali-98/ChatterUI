module.exports = {
    root: true,
    extends: ['universe/native', 'universe/shared/typescript-analysis'],
    overrides: [
        {
            files: ['*.ts', '*.tsx', '*.d.ts', '*.js', '*.jsx'],
            parserOptions: {
                project: './tsconfig.json',
            },
        },
    ],

    plugins: ['prettier', 'eslint-plugin-react-compiler', 'internal'],
    rules: {
        'internal/enforce-spacing-values': 'error',
        'react-compiler/react-compiler': 'error',
        'prettier/prettier': [
            'error',
            {},
            {
                usePrettierrc: true,
            },
        ],
        radix: 'off',
        'no-unused-vars': 'off',
        '@typescript-eslint/no-unused-vars': 'off',
        'object-shorthand': ['warn', 'consistent'],
    },
}
