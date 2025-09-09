module.exports = function (api) {
    api.cache(true)
    return {
        presets: ['babel-preset-expo'],
        plugins: [
            ['babel-plugin-react-compiler'], // must run first!
            ['inline-import', { extensions: ['.sql'] }],
            ['react-native-worklets/plugin'],
            ...(process.env.NODE_ENV === 'production'
                ? [['transform-remove-console', { exclude: ['error', 'warn'] }]]
                : []),
        ],
    }
}
