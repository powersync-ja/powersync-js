const { getDefaultConfig } = require('expo/metro-config');
const { withRozenite } = require('@rozenite/metro');

// Rozenite adds plugin panels to React Native DevTools. Off unless WITH_ROZENITE=true.
module.exports = withRozenite(getDefaultConfig(__dirname), {
  enabled: process.env.WITH_ROZENITE === 'true'
});
