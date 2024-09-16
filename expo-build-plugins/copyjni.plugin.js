const { withDangerousMod } = require('@expo/config-plugins')
const fse = require('fs-extra')
const path = require('path')

module.exports = function withJNILibs(config, props) {
    return withDangerousMod(config, [
        'android',
        (config) => {
            const { projectRoot } = config.modRequest
            const assetPath = path.join(projectRoot, 'assets', 'jniLibs')
            const jnipath = path.join(projectRoot, 'android', 'app', 'src', 'main', 'jniLibs')

            if (fse.existsSync(assetPath)) {
                fse.copySync(assetPath, jnipath, { overwrite: true }, (err) => {
                    if (err) {
                        console.error('Error copying JNI libs:', err)
                    } else {
                        console.log('JNI libs copied successfully!')
                    }
                })
            } else {
                console.log(`No JNI libs found in ${assetPath}`)
            }
            return config
        },
    ])
}
