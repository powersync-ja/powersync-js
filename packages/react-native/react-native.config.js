export default {
  dependency: {
    platforms: {
      ios: {
        podspecPath: 'powersync-react-native.podspec'
      },
      android: {}
    }
  },
  spm: {
    packageFile: {
      name: 'PowerSyncReactNative',
      Path: 'ios/Package.swift'
    }
  }
};
