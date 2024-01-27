module.exports = {
    root: true,
    env: 'node',
    extends: ['universe/native', 'universe/shared/typescript-analysis'],
    overrides: [
        {
            files: ['*.ts', '*.tsx', '*.d.ts', '*.js', '*.jsx'],
            parserOptions: {
                project: './tsconfig.json',
            },
        },
    ],
    plugins: ['prettier'],
    rules: {
        'prettier/prettier': [
            'error',
            {
                trailingComma: 'es5',
                printWidth: 100,
                tabWidth: 4,
                singleQuote: true,
                bracketSameLine: true,
            },
        ],
        radix: 'off',
        'no-unused-vars': 'off',
    },
}
