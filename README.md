# ChatterUI

<div>
<img src ="https://github.com/Vali-98/ChatterUI/blob/master/assets/screenshots/mainchat.png" width="150" > 
<img src ="https://github.com/Vali-98/ChatterUI/blob/master/assets/screenshots/charsmenu.png" width="150" > 
<img src ="https://github.com/Vali-98/ChatterUI/blob/master/assets/screenshots/optionsmenu.png" width="150" > 
</div>
Simple frontend for LLMs built in react-native.

**_This app is highly experimental, expect to lose your chat histories on updates._**

### What Is ChatterUI?

ChatterUI is a native mobile frontend for managing chat files and character cards similar to projects like TavernAI / SillyTavern.
Built for the purpose of learning Javascript, so it might be a little rough around the edges.

### Supported Backends

-   KoboldAI
-   AI Horde
-   text-generation-webui
-   Mancer
-   Text Completion
-   Local using [llama.rn](https://github.com/mybigday/llama.rn)
-   Open Router
-   OpenAI

### Building From Source

Building from source has **not** been tested.
Requires Node.js and Android SDK. Expo uses EAS to build apps which requires a Linux environment.

```
npm install
eas build --platform android --local
```

### IOS

Currently untested as I do not own proper devices to run it. Assistance here would be greatly appreciated!

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
