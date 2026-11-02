const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');
const { withRozenite } = require('@rozenite/metro');

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * @type {import('@react-native/metro-config').MetroConfig}
 */
const config = {};

// Rozenite adds plugin panels to React Native DevTools. Off unless WITH_ROZENITE=true.
module.exports = withRozenite(mergeConfig(getDefaultConfig(__dirname), config), {
  enabled: process.env.WITH_ROZENITE === 'true'
});
