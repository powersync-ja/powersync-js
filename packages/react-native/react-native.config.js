// Hack: @react-native-community/cli reads this file with import(), while react-native/scripts/spm/expand-spm-dependencies.js
// reads it using require(). Both are able to read this file, but in the require case we need to return the spm key we
// care about as a separate item because it otherwise gets exported as {default: ...} object.
export const spm = {
  // Change the Swift Package name and target autolinking expects for this npm package. By default, it would use
  // 'ReactNative' which conflicts with RN itself.
  // This option appears to be undocumented, it's read here: https://github.com/react/react-native/blob/2dd6d4b482c2512d3e92fbaf0a10a9f8ac055e5d/packages/react-native/scripts/spm/expand-spm-dependencies.js#L59-L82
  name: 'PowerSyncReactNative'
};

export default {
  spm
};
