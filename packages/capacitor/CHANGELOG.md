# @powersync/capacitor

## 0.5.3

### Patch Changes

- c2d0f9e: Update PowerSync SQLite core extension to 0.4.12
- 26c2c24: Fixed "Error in reading buffer" error on iOS when connecting via WebSocket.
- Updated dependencies [1506543]
- Updated dependencies [c2d0f9e]
- Updated dependencies [c730604]
- Updated dependencies [838479e]
- Updated dependencies [756a0cf]
  - @powersync/web@1.38.0

## 0.5.2

### Patch Changes

- 8f8ef1c: Remove `async-mutex` dependency in favor of internal implementation.
- Updated dependencies [45f427c]
- Updated dependencies [8f8ef1c]
  - @powersync/web@1.37.0

## 0.5.1

### Patch Changes

- 42afb0e: Share common db adapter implementation logic.
- Updated dependencies [42afb0e]
  - @powersync/web@1.36.0

## 0.5.0

### Minor Changes

- 6c855cd: Improve raw tables by making `put` and `delete` statements optional if a local name is given.

### Patch Changes

- Updated dependencies [6c855cd]
  - @powersync/web@1.35.0

## 0.4.1

### Patch Changes

- f0a36c9: Update PowerSync SQLite core extension to version 0.4.11.
- Updated dependencies [f0a36c9]
  - @powersync/web@1.34.0

## 0.4.0

### Minor Changes

- 8dee8d7: Removed `async-lock` dependency in favor of `async-mutex`.

### Patch Changes

- 8dee8d7: Fixed potential issue where extreme amounts of concurrent calls to `writeLock` could reject with the error "Too many pending tasks in queue"
- c506299: Enable trusted publishing for the PowerSync SDK.
- Updated dependencies [d86799a]
- Updated dependencies [ae3b188]
- Updated dependencies [c506299]
  - @powersync/web@1.33.0

## 0.3.0

### Minor Changes

- 25ece59: Improved ESM exports and module declarations. Importing these packages in SSR environments should no longer throw errors.

### Patch Changes

- Updated dependencies [25ece59]
- Updated dependencies [8db47f3]
- Updated dependencies [aaf6037]
- Updated dependencies [acf6b70]
- Updated dependencies [aaf6037]
  - @powersync/web@1.32.0

## 0.2.0

### Minor Changes

- 616c2a1: Added ability to specify `appMetadata` for sync/stream requests.

  Note: This requires a PowerSync service version `>=1.17.0` in order for logs to display metadata.

  ```javascript
  powerSync.connect(connector, {
    // This will be included in PowerSync service logs
    appMetadata: {
      app_version: MY_APP_VERSION
    }
  });
  ```

### Patch Changes

- 299c6dc: Update PowerSync SQLite core to v0.4.10
- Updated dependencies [299c6dc]
- Updated dependencies [616c2a1]
  - @powersync/web@1.30.0

## 0.1.3

### Patch Changes

- 4c66487: Fixed readTransaction method throwing "not allowed in read-only mode" errors
  - @powersync/web@1.28.2

## 0.1.2

### Patch Changes

- 3e4a25c: Don't minify releases, enable source maps.
- Updated dependencies [3e4a25c]
  - @powersync/web@1.28.1

## 0.1.1

### Patch Changes

- 58cf447: [Android] Fixed missing CMakeLists file error.
- fe71006: Updated limitations in README

## 0.1.0

### Minor Changes

- a6e3db4: Initial release

### Patch Changes

- Updated dependencies [2f8b30c]
  - @powersync/web@1.28.0
