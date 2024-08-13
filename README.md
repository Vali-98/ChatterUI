# ChatterUI - A simple app for LLMs

ChatterUI is a native mobile frontend for managing chat files and character cards inspired by SillyTavern.
It aims to provide a mobile friendly experience to inferface with Large Language models.
ChatterUI supports multiple backends and can even run GGUF models locally on your device.

Support the development of this app here:

<a href="https://ko-fi.com/vali98" target='_blank'><img height='35' style='border:0px;height:46px;' src='https://az743702.vo.msecnd.net/cdn/kofi3.png?v=0' border='0' alt='Support me on ko-fi.com' /></a>

<div>
<img src ="https://github.com/Vali-98/ChatterUI/blob/master/assets/screenshots/recents.png" width="150" > 
<img src ="https://github.com/Vali-98/ChatterUI/blob/master/assets/screenshots/mainchat.png" width="150" > 
<img src ="https://github.com/Vali-98/ChatterUI/blob/master/assets/screenshots/charsmenu.png" width="150" > 
<br/>
<img src ="https://github.com/Vali-98/ChatterUI/blob/master/assets/screenshots/sampler.png" width="150" > 
<img src ="https://github.com/Vali-98/ChatterUI/blob/master/assets/screenshots/instruct.png" width="150" > 
<img src ="https://github.com/Vali-98/ChatterUI/blob/master/assets/screenshots/optionsmenu.png" width="150" > 
</div>

## Supported Backends

### On Device Inferencing:

-   Local device inferencing using [cui-llama.rn](https://github.com/Vali-98/cui-llama.rn)

_To use Local inferencing, go to API > Local > Import Model and choose a gguf model that can fit on your device's memory. Then load the model to begin!_

_For devices with Snapdragon 8 Gen 1 and above or Exynos 2200+, it is recommended to use the Q4_0_4_8 quantization for enhanced prompt processing._

### Open Source Backends:

-   koboldcpp
-   text-generation-webui
-   Ollama

### Dedicated API:

-   OpenAI
-   Claude _(with ability to use a proxy)_
-   Cohere
-   Open Router
-   Mancer
-   AI Horde

### Customizable backends:

-   Generic Text Completions
-   Generic Chat Completions

_These should be compliant with any Text Completion/Chat Completion backends such as Groq or Infermatic._

## Development

### Android

To run a development build, follow these simple steps:

-   Install any Java 17/21 SDK of your choosing
-   Install `android-sdk` via `Android Studio`
-   Clone the repo:

```
git clone https://github.com/Vali-98/ChatterUI.git
```

-   Install dependencies via npm and run via Expo:

```
npm install
npx expo run:android
```

#### Building an APK

Requires Node.js and Android SDK. Expo uses EAS to build apps which requires a Linux environment.

1. Clone the repo.
2. Rename the `eas.json.example` to `eas.json`.
3. Modify `"ANDROID_SDK_ROOT"` to the directory of your Android SDK
4. Run the following:

```
npm install
eas build --platform android --local
```

### IOS

Currently untested as I do have the resources to develop for IoS. Assistance here would be greatly appreciated!

### Fix For Text Streaming in Development

(Note: This is only applicable for versions prior to Expo SDK 51 in 20fbff2fb6375cfd0d76acf06a9cd13ae9126c57)

ReactNativeFlipper causes streaming to break on Android development builds. To fix this, navigate to:

`android/app/src/main/java/com/Vali98/ChatterUI/MainApplication.kt`

Then comment out the following:

```
if (BuildConfig.DEBUG) {
    // hacky fix for: https://github.com/react-native-community/fetch
    // ReactNativeFlipper.initializeFlipper(this, reactNativeHost.reactInstanceManager)
}
```
