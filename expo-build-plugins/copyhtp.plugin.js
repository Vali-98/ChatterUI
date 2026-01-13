const { withDangerousMod } = require('@expo/config-plugins')
const fs = require('fs')
const path = require('path')

const SOURCE_PATH = 'node_modules/cui-llama.rn/bin/arm64-v8a'
const TARGET_RELATIVE_PATH = 'app/src/main/assets/ggml-hexagon'

function syncDevAssets(projectRoot, androidPath) {
    const sourcePath = path.join(projectRoot, SOURCE_PATH)
    const targetPath = path.join(androidPath, TARGET_RELATIVE_PATH)

    console.log('RNLlama: Dev environment detected. Syncing HTP libraries.')

    if (!fs.existsSync(sourcePath)) {
        console.warn(`RNLlama: Source not found at ${sourcePath}`)
        return
    }

    fs.mkdirSync(targetPath, { recursive: true })

    const files = fs.readdirSync(sourcePath)
    for (const file of files) {
        if (file.endsWith('.so') && file.startsWith('libggml-htp')) {
            fs.copyFileSync(path.join(sourcePath, file), path.join(targetPath, file))
            console.log(`RNLlama: Copied ${file}`)
        }
    }

    console.log('RNLlama: Dev HTP assets ready.')
}

module.exports = function withRNLlamaHTP(config) {
    return withDangerousMod(config, [
        'android',
        async (config) => {
            const projectRoot = config.modRequest.projectRoot
            const androidPath = path.join(projectRoot, 'android')

            syncDevAssets(projectRoot, androidPath)

            return config
        },
    ])
}
