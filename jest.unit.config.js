/** @type {import('jest').Config} */
module.exports = {
    testEnvironment: 'node',
    transform: {
        '^.+\\.tsx?$': ['ts-jest', { tsconfig: { allowJs: true } }],
    },
    moduleNameMapper: {
        '^@lib/(.*)$': '<rootDir>/lib/$1',
    },
    testMatch: ['**/__tests__/**/*.test.ts'],
}
