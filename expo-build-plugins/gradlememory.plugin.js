const { withGradleProperties } = require('expo/config-plugins')

const gradleJvmArgs = '-Xmx4096m -XX:MaxMetaspaceSize=1024m'

module.exports = function withGradleMemory(config) {
    return withGradleProperties(config, (config) => {
        const existingProperty = config.modResults.find(
            (item) => item.type === 'property' && item.key === 'org.gradle.jvmargs'
        )

        if (existingProperty) {
            existingProperty.value = gradleJvmArgs
        } else {
            config.modResults.push({
                type: 'property',
                key: 'org.gradle.jvmargs',
                value: gradleJvmArgs,
            })
        }

        return config
    })
}
