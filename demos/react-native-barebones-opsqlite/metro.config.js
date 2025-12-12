const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * @type {import('@react-native/metro-config').MetroConfig}
 */
const config = {
  transformer: {
    getTransformOptions: async () => ({
      transform: {
        inlineRequires: {
          blockList: {
            [require.resolve('@powersync/react-native')]: true
          }
        }
      }
    })
  }
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
