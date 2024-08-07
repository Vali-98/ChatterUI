module.exports = function (api) {
    api.cache(true)
    return {
        presets: ['babel-preset-expo'],
        plugins: [
            [
                'babel-plugin-react-compiler',
                {
                    runtimeModule: 'react-compiler-runtime',
                },
            ], // must run first!
            ['inline-import', { extensions: ['.sql'] }],
            // Required for expo-routerouter/
            'react-native-reanimated/plugin',
        ],
    }
}
