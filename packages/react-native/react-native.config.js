// Hack: @react-native-community/cli reads this file with import(), while react-native/scripts/spm/expand-spm-dependencies.js
// reads it using require(). Both are able to read this file, but in the require case we need to return the spm key we
// care about as a separate item because it otherwise gets exported as {default: ...} object.
export const spm = {
  name: 'PowerSyncReactNative'
};

export default {
  spm
};
