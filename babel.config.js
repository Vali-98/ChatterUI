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
            [
                'module-resolver',
                {
                    root: ['.'],
                    extension: ['.js', '.jsx', '.ts', '.tsx'],
                    alias: {
                        '@globals': './constants/global',
                        '@components': './components',
                        '@assets': './assets',
                        '@public': './public',
                        '@constants': './constants',
                        '@lib': './lib',
                        '@db': './db/db',
                    },
                },
            ],
        ],
    }
}
