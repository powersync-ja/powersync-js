# @powersync/capacitor

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
