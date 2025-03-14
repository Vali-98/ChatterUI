const { AndroidConfig, withAndroidManifest } = require('expo/config-plugins')

function addAttributesToApplication(androidManifest, attributes) {
    const app = AndroidConfig.Manifest.getMainApplicationOrThrow(androidManifest)

    if (app?.$) {
        app.$ = { ...app.$, ...attributes }
    }

    return androidManifest
}

module.exports = function withAndroidApplicationAttributes(config, attributes) {
    return withAndroidManifest(config, (config) => {
        config.modResults = addAttributesToApplication(config.modResults, attributes)
        return config
    })
}

// Taken from : https://github.com/wodin/rn-hce-test/blob/459858258da9a2358e3038b98aff79c44bbd53c9/plugins/withAndroidApplicationAttributes.js
