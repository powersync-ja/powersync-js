const { getDefaultConfig } = require('expo/metro-config');
const { withRozenite } = require('@rozenite/metro');

// Rozenite adds plugin panels to React Native DevTools. Off unless WITH_ROZENITE=true.
// `projectType` is explicit because Rozenite detects Expo only from an `app.json`, and this demo uses `app.config.ts`.
module.exports = withRozenite(getDefaultConfig(__dirname), {
  enabled: process.env.WITH_ROZENITE === 'true',
  projectType: 'expo'
});
