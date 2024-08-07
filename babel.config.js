module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // Required for expo-router
      'expo-router/babel',
      'react-native-reanimated/plugin',
      ["module-resolver", {
        root: ["."],
        alias: {
          "@globals": "./constants/global",
          "@components": "./components",
          "@assets": "./assets",
          "@public": "./public",
          "@constants" : "./constants",
        },
        extension: [
          '.js',
          '.ts',
          '.tsx',
        ],
      }],
    ],
  };
};
 