# ChatterUI

<div>
<img src ="https://github.com/Vali-98/ChatterUI/blob/master/assets/screenshots/mainchat.png" width="150" > 
<img src ="https://github.com/Vali-98/ChatterUI/blob/master/assets/screenshots/charsmenu.png" width="150" > 
<img src ="https://github.com/Vali-98/ChatterUI/blob/master/assets/screenshots/optionsmenu.png" width="150" > 
</div>
Simple frontend for LLMs built using react-native.

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

### Building From Source

Building from source has **not** been tested.
Requires Node.js and Android SDK. Expo uses EAS to build apps which requires a Linux environment. Release APKs are built in WSL.

```
npm install
eas build --platform android --local
```

### Roadmap

-   NovelAI support
-   Lorebooks
-   Chat Management (export, import from compatible files)
