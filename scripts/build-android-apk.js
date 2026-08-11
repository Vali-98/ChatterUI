const { copyFileSync, existsSync, mkdirSync } = require('node:fs')
const { delimiter, dirname, join, resolve } = require('node:path')
const { spawnSync } = require('node:child_process')

const projectRoot = resolve(__dirname, '..')
const minimumNode = [20, 19, 4]

const currentNode = process.versions.node.split('.').map(Number)
const nodeIsSupported =
    currentNode[0] > minimumNode[0] ||
    (currentNode[0] === minimumNode[0] && currentNode[1] > minimumNode[1]) ||
    (currentNode[0] === minimumNode[0] &&
        currentNode[1] === minimumNode[1] &&
        currentNode[2] >= minimumNode[2])

if (!nodeIsSupported) {
    console.error(
        `Node ${minimumNode.join('.')} or newer is required (current: ${process.versions.node}).`
    )
    process.exit(1)
}

process.env.NODE_ENV = 'production'
process.env.APP_VARIANT = 'production'
const environment = { ...process.env }

if (process.platform === 'win32') {
    const androidStudioJava = 'C:\\Program Files\\Android\\Android Studio\\jbr'
    const standardAndroidSdk = environment.LOCALAPPDATA
        ? join(environment.LOCALAPPDATA, 'Android', 'Sdk')
        : undefined

    if (!environment.JAVA_HOME && existsSync(join(androidStudioJava, 'bin', 'java.exe'))) {
        environment.JAVA_HOME = androidStudioJava
    }
    if (!environment.ANDROID_HOME && standardAndroidSdk && existsSync(standardAndroidSdk)) {
        environment.ANDROID_HOME = standardAndroidSdk
    }
}

environment.ANDROID_HOME ||= environment.ANDROID_SDK_ROOT
environment.ANDROID_SDK_ROOT ||= environment.ANDROID_HOME

if (!environment.JAVA_HOME) {
    console.error('JAVA_HOME is not set. Install Java 17 or 21, then set JAVA_HOME.')
    process.exit(1)
}
if (!environment.ANDROID_HOME) {
    console.error('ANDROID_HOME is not set. Install the Android SDK, then set ANDROID_HOME.')
    process.exit(1)
}

const pathKey = Object.keys(environment).find((key) => key.toLowerCase() === 'path') || 'PATH'
environment[pathKey] = [
    dirname(process.execPath),
    join(environment.JAVA_HOME, 'bin'),
    join(environment.ANDROID_HOME, 'platform-tools'),
    environment[pathKey],
].join(delimiter)

const run = (command, args, cwd = projectRoot) => {
    const result = spawnSync(command, args, { cwd, env: environment, stdio: 'inherit' })
    if (result.error) throw result.error
    if (result.status !== 0) process.exit(result.status ?? 1)
}

const gradleArguments = ['assembleRelease', '--no-daemon']

console.log('Generating the production Android project...')
run(process.execPath, [
    join(projectRoot, 'node_modules', 'expo', 'bin', 'cli'),
    'prebuild',
    '--clean',
    '--platform',
    'android',
])

console.log('Building the release APK...')
if (process.platform === 'win32') {
    const commandPrompt = environment.ComSpec || join(environment.SystemRoot, 'System32', 'cmd.exe')
    run(
        commandPrompt,
        ['/d', '/s', '/c', `gradlew.bat ${gradleArguments.join(' ')}`],
        join(projectRoot, 'android')
    )
} else {
    run('./gradlew', gradleArguments, join(projectRoot, 'android'))
}

const appVersion = require(join(projectRoot, 'app.config.js')).expo.version
const sourceApk = join(
    projectRoot,
    'android',
    'app',
    'build',
    'outputs',
    'apk',
    'release',
    'app-release.apk'
)
const artifactDirectory = join(projectRoot, 'artifacts')
const outputApk = join(artifactDirectory, `ChatterUI-${appVersion}.apk`)

if (!existsSync(sourceApk)) {
    console.error(`Gradle completed but the APK was not found at ${sourceApk}.`)
    process.exit(1)
}

mkdirSync(artifactDirectory, { recursive: true })
copyFileSync(sourceApk, outputApk)
console.log(`APK ready: ${outputApk}`)
