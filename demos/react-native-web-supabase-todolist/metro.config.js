// Learn more https://docs.expo.dev/guides/monorepos
const { getDefaultConfig } = require('expo/metro-config');
const config = getDefaultConfig(__dirname);

// Needed to make `@powersync/web/umd` imports work
config.resolver.unstable_enablePackageExports = true;

// Expo removes the react-native export condition for React Native web: https://github.com/expo/expo/blob/874ddfc86c0bdaeeb43f56b4386d271ba869ad47/packages/%40expo/metro-config/src/ExpoMetroConfig.ts#L309
// The PowerSync web SKD needs to be resolved with an RN-specific export condition to work with Metro.
config.resolver.unstable_conditionsByPlatform.web.push('react-native-web');

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform === 'web') {
    if (['react-native-prompt-android', '@powersync/react-native'].includes(moduleName)) {
      return {
        type: 'empty'
      };
    }
    const mapping = { 'react-native': 'react-native-web' };
    if (mapping[moduleName]) {
      console.log('remapping', moduleName);
      return context.resolveRequest(context, mapping[moduleName], platform);
    }
  } else {
    if (['@powersync/web'].includes(moduleName)) {
      return {
        type: 'empty'
      };
    }
  }

  // Ensure you call the default resolver.
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
