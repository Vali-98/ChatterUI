
# ChatterUI
<img src ="https://github.com/Vali-98/ChatterUI/blob/master/assets/images/adaptive-icon.png" width="150" > 
Simple frontend for LLMs built using react-native. 

***This app is highly experimental, expect to lose your chat histories on updates.***

### What is it?
A frontend for managing chat files and character cards similar to projects like TavernAI / SillyTavern.
Built for the purpose of learning Javascript, so it may be a little rough around the edges.

### Supported Backends
- KoboldAI

### Building from source.
Building from source has **not** been tested.
Requires Node.js and Android SDK. Expo uses EAS to build apps which in a Linux environment. Release APKs are built in WSL.
```
npm install
eas build --platform android --local
```
