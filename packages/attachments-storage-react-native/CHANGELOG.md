# @powersync/attachments-storage-react-native

## 0.1.1

### Patch Changes

- 08b125c: Fix `ExpoFileSystemStorageAdapter.moveFile` returning a stale size.
- Updated dependencies [a07998d]
  - @powersync/common@2.2.0

## 0.1.0

### Minor Changes

- 5af3523: Add a streaming attachment transport (`AttachmentTransportAdapter`) and `AttachmentQueue.saveFileFromUri`, with native `createTransportAdapter` implementations for Node, Expo (SDK 56+), and React Native, so large files transfer without being buffered in JS memory.

### Patch Changes

- Updated dependencies [5af3523]
  - @powersync/common@2.1.0

## 0.0.3

### Patch Changes

- 367ad55: Remove CommonJS distribution.
- Updated dependencies [ce608a0]
- Updated dependencies [57373f9]
- Updated dependencies [299adaf]
- Updated dependencies [5650e7f]
- Updated dependencies [2c3370d]
- Updated dependencies [06db9d8]
  - @powersync/common@2.0.0

## 0.0.2

### Patch Changes

- c506299: Enable trusted publishing for the PowerSync SDK.
- 875ea0e: Added new @powersync/attachments-storage-react-native package providing LocalStorageAdapter implementations for React Native environments. Includes ExpoFileSystemStorageAdapter and ReactNativeFileSystemStorageAdapter for device-based attachment file storage.
- Updated dependencies [d86799a]
- Updated dependencies [c506299]
- Updated dependencies [8dee8d7]
  - @powersync/common@1.47.0
