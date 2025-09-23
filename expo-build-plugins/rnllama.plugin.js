const {
    withDangerousMod,
    withXcodeProject,
    withAndroidManifest,
    createRunOncePlugin,
} = require('@expo/config-plugins')
const fs = require('fs')
const path = require('path')

const PLUGIN_NAME = 'llama-rn-plugin'
const PLUGIN_VERSION = '1.0.0'

/**
 * @typedef {Object} PluginOptions
 * @property {boolean} [enableEntitlements=true] Enable adding iOS entitlements
 * @property {string}  [entitlementsProfile='production'] EAS build profile name to enable entitlements for
 * @property {boolean} [forceCxx20=true] Force C++20 for all Pods targets
 * @property {boolean} [enableOpenCL=true] Enable <uses-native-library> in AndroidManifest
 */

/** @type {import('@expo/config-plugins').ConfigPlugin<PluginOptions>} */
function withLlamaRn(config, options = {}) {
    const {
        enableEntitlements = true,
        entitlementsProfile = 'production',
        forceCxx20 = true,
        enableOpenCL = true, // ✅ enabled by default
    } = options

    // 1) Conditionally add iOS entitlements
    const isProdProfile =
        process.env.EAS_BUILD_PROFILE === entitlementsProfile ||
        process.env.NODE_ENV === 'production'

    if (enableEntitlements && isProdProfile) {
        config.ios = config.ios || {}
        config.ios.entitlements = config.ios.entitlements || {}
        config.ios.entitlements['com.apple.developer.kernel.extended-virtual-addressing'] = true
        config.ios.entitlements['com.apple.developer.kernel.increased-memory-limit'] = true
    }

    // 2) Enforce C++20 for app target and all Pods
    if (forceCxx20) {
        // 2a) App target via Xcode project settings
        config = withXcodeProject(config, (c) => {
            const project = c.modResults
            const configs = project.pbxXCBuildConfigurationSection()
            for (const key in configs) {
                const cfg = configs[key]
                if (typeof cfg !== 'object' || !cfg.buildSettings) continue
                cfg.buildSettings['CLANG_CXX_LANGUAGE_STANDARD'] = '"gnu++20"'
                cfg.buildSettings['CLANG_CXX_LIBRARY'] = '"libc++"'
                const current = String(cfg.buildSettings['OTHER_CPLUSPLUSFLAGS'] || '$(inherited)')
                if (!current.includes('-std=gnu++20')) {
                    cfg.buildSettings['OTHER_CPLUSPLUSFLAGS'] = '"$(inherited) -std=gnu++20"'
                } else if (!current.startsWith('"')) {
                    cfg.buildSettings['OTHER_CPLUSPLUSFLAGS'] = `"${current}"`
                }
            }
            return c
        })

        // 2b) Pods targets via Podfile post_install
        config = withDangerousMod(config, [
            'ios',
            async (c) => {
                const podfilePath = path.join(c.modRequest.projectRoot, 'ios', 'Podfile')
                if (!fs.existsSync(podfilePath)) return c
                let contents = fs.readFileSync(podfilePath, 'utf8')

                if (contents.includes('LLAMA_RN_CXX20')) return c

                const postInstallIdx = contents.indexOf('post_install do |installer|')
                if (postInstallIdx === -1) return c

                const endIdx = contents.indexOf('\n  end', postInstallIdx)
                if (endIdx === -1) return c

                const insert = `\n    # LLAMA_RN_CXX20: Force C++20 on all Pods\n    installer.pods_project.targets.each do |target|\n      target.build_configurations.each do |config|\n        config.build_settings['CLANG_CXX_LANGUAGE_STANDARD'] = 'gnu++20'\n        config.build_settings['CLANG_CXX_LIBRARY'] = 'libc++'\n        config.build_settings['OTHER_CPLUSPLUSFLAGS'] = '$(inherited) -std=gnu++20'\n      end\n    end\n`

                const updated = contents.slice(0, endIdx) + insert + contents.slice(endIdx)
                fs.writeFileSync(podfilePath, updated)
                return c
            },
        ])
    }

    // 3) Add Android <uses-native-library> for OpenCL
    if (enableOpenCL) {
        config = withAndroidManifest(config, (c) => {
            const app = c.modResults.manifest.application?.[0]
            if (!app) return c

            if (!app['uses-native-library']) {
                app['uses-native-library'] = []
            }

            const libs = app['uses-native-library']
            const alreadyExists = libs.some((lib) => lib.$['android:name'] === 'libOpenCL.so')

            if (!alreadyExists) {
                libs.push({
                    $: {
                        'android:name': 'libOpenCL.so',
                        'android:required': 'false',
                    },
                })
            }
            return c
        })
    }

    return config
}

module.exports = createRunOncePlugin(withLlamaRn, PLUGIN_NAME, PLUGIN_VERSION)
