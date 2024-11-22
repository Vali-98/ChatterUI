module.exports = {
    expo: {
        name: 'ChatterUI',
        newArchEnabled: true,
        slug: 'ChatterUI',
        version: '0.8.2',
        orientation: 'portrait',
        icon: './assets/images/icon.png',
        scheme: 'chatterui',
        userInterfaceStyle: 'automatic',
        /*splash: {
            image: './assets/images/splash.png',
            resizeMode: 'cover',
            backgroundColor: '#000000',
        },*/
        assetBundlePatterns: ['**/*'],
        ios: {
            supportsTablet: true,
        },
        android: {
            adaptiveIcon: {
                foregroundImage: './assets/images/adaptive-icon-foreground.png',
                backgroundImage: './assets/images//adaptive-icon-background.png',
                monochromeImage: './assets/images/adaptive-icon-foreground.png',
                backgroundColor: '#000',
            },
            package: 'com.Vali98.ChatterUI',

            /*splash: {
                image: './assets/images/splash.png',
                resizeMode: 'cover',
                backgroundColor: '#000000',
            },*/
            userInterfaceStyle: 'dark',
            permissions: [
                'android.permission.FOREGROUND_SERVICE',
                'android.permission.WAKE_LOCK',
                'android.permission.FOREGROUND_SERVICE_DATA_SYNC',
            ],
        },
        web: {
            bundler: 'metro',
            output: 'static',
            favicon: './assets/images/adaptive-icon.png',
        },
        plugins: [
            [
                'expo-custom-assets',
                {
                    assetsPaths: ['./assets/models'],
                    assetsDirName: 'appAssets',
                },
            ],
            'expo-router',
            [
                'expo-build-properties',
                {
                    android: {
                        largeHeap: true,
                        usesCleartextTraffic: true,
                        enableProguardInReleaseBuilds: true,
                        enableShrinkResourcesInReleaseBuilds: true,
                        useLegacyPackaging: true,
                        extraProguardRules: '-keep class com.rnllama.** { *; }',
                    },
                },
            ],
            [
                'expo-splash-screen',
                {
                    backgroundColor: '#000000',
                    image: './assets/images/adaptive-icon.png',
                    imageWidth: 200,
                },
            ],
            './expo-build-plugins/bgactions.plugin.js',
            './expo-build-plugins/copyjni.plugin.js',
            './expo-build-plugins/usercert.plugin.js',
        ],
        experiments: {
            typedRoutes: true,
            // reactCompiler: true,
        },
        extra: {
            router: {
                origin: false,
            },
            eas: {
                projectId: 'd588a96a-5eb0-457a-85bc-e21acfdc60e9',
            },
        },
    },
}
