# ChatterUI - A simple app for LLMs

ChatterUI is a native mobile frontend for managing chat files and character cards inspired by SillyTavern.
It aims to provide a mobile friendly experience to inferface with Large Language models.
ChatterUI supports multiple backends and can even run GGUF models locally on your device.

<div>
<img src ="https://github.com/Vali-98/ChatterUI/blob/master/assets/screenshots/recents.png" width="150" > 
<img src ="https://github.com/Vali-98/ChatterUI/blob/master/assets/screenshots/mainchat.png" width="150" > 
<img src ="https://github.com/Vali-98/ChatterUI/blob/master/assets/screenshots/charsmenu.png" width="150" > 
<br/>
<img src ="https://github.com/Vali-98/ChatterUI/blob/master/assets/screenshots/sampler.png" width="150" > 
<img src ="https://github.com/Vali-98/ChatterUI/blob/master/assets/screenshots/instruct.png" width="150" > 
<img src ="https://github.com/Vali-98/ChatterUI/blob/master/assets/screenshots/optionsmenu.png" width="150" > 
</div>

### Supported Backends

-   Local using [llama.rn](https://github.com/mybigday/llama.rn)
-   koboldcpp
-   text-generation-webui
-   Generic Text Completions - you can plug this into any spec compliant backend
-   AI Horde
-   Mancer
-   Open Router
-   OpenAI

### Developing

Clone the repo:

```
git clone https://github.com/Vali-98/ChatterUI.git
```

Install dependencies via npm and run via Expo:

```
npm install
npx expo run:android
```

### Building an APK

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

ReactNativeFlipper causes streaming to break on Android development builds. To fix this, navigate to:

`android/app/src/main/java/com/Vali98/ChatterUI/MainApplication.kt`

Then comment out the following:

```
if (BuildConfig.DEBUG) {
    // hacky fix for: https://github.com/react-native-community/fetch
    // ReactNativeFlipper.initializeFlipper(this, reactNativeHost.reactInstanceManager)
}
```

### Roadmap

-   NovelAI support
-   Lorebooks
-   Chat Management (export, import from compatible files)
