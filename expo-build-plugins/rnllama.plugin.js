import pkg from '@expo/config-plugins'
import * as fs from 'fs'
import * as path from 'path'

const PLUGIN_NAME = 'llama-rn-plugin'
const PLUGIN_VERSION = '1.0.0'

const { withDangerousMod, withXcodeProject, withAndroidManifest, createRunOncePlugin } = pkg

const withLlamaRn = (config, options = {}) => {
    const {
        enableEntitlements = true,
        entitlementsProfile = 'production',
        forceCxx20 = true,
        enableOpenCLAndHexagon = true,
    } = options

    const isProdProfile =
        process.env.EAS_BUILD_PROFILE === entitlementsProfile ||
        process.env.NODE_ENV === 'production' ||
        (Array.isArray(entitlementsProfile) &&
            entitlementsProfile.includes(process.env.EAS_BUILD_PROFILE || ''))

    if (enableEntitlements && isProdProfile) {
        config.ios = config.ios || {}
        config.ios.entitlements = config.ios.entitlements || {}
        config.ios.entitlements['com.apple.developer.kernel.extended-virtual-addressing'] = true
        config.ios.entitlements['com.apple.developer.kernel.increased-memory-limit'] = true
    }

    if (forceCxx20) {
        config = withXcodeProject(config, (c) => {
            const project = c.modResults
            const configs = project.pbxXCBuildConfigurationSection()
            Object.values(configs).forEach((cfg) => {
                if (typeof cfg !== 'object' || !cfg.buildSettings) {
                    return
                }

                cfg.buildSettings['CLANG_CXX_LANGUAGE_STANDARD'] = '"gnu++20"'
                cfg.buildSettings['CLANG_CXX_LIBRARY'] = '"libc++"'

                const current = String(cfg.buildSettings['OTHER_CPLUSPLUSFLAGS'] || '$(inherited)')

                if (!current.includes('-std=gnu++20')) {
                    cfg.buildSettings['OTHER_CPLUSPLUSFLAGS'] = '"$(inherited) -std=gnu++20"'
                    return
                }

                if (!current.startsWith('"')) {
                    cfg.buildSettings['OTHER_CPLUSPLUSFLAGS'] = `"${current}"`
                }
            })

            return c
        })

        config = withDangerousMod(config, [
            'ios',
            async (c) => {
                const podfilePath = path.join(c.modRequest.projectRoot, 'ios', 'Podfile')
                if (!fs.existsSync(podfilePath)) return c
                const contents = fs.readFileSync(podfilePath, 'utf8')

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

    if (enableOpenCLAndHexagon) {
        config = withAndroidManifest(config, (c) => {
            const app = c.modResults.manifest.application?.[0]
            if (!app) return c

            if (!app?.['uses-native-library']) {
                app['uses-native-library'] = []
            }

            const libs = app['uses-native-library']
            const openclAlreadyExists = libs.some((lib) => lib.$['android:name'] === 'libOpenCL.so')
            const cdsprpcAlreadyExists = libs.some(
                (lib) => lib.$['android:name'] === 'libcdsprpc.so'
            )

            if (!openclAlreadyExists) {
                libs.push({
                    $: {
                        'android:name': 'libOpenCL.so',
                        'android:required': 'false',
                    },
                })
            }
            if (!cdsprpcAlreadyExists) {
                libs.push({
                    $: {
                        'android:name': 'libcdsprpc.so',
                        'android:required': 'false',
                    },
                })
            }
            return c
        })
    }

    return config
}

export default createRunOncePlugin(withLlamaRn, PLUGIN_NAME, PLUGIN_VERSION)
