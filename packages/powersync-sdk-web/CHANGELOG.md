# @journeyapps/powersync-sdk-web

## 0.3.2

### Patch Changes

- 8fc2164: Minor code cleanup for shared sync worker.
- Updated dependencies [8fc2164]
  - @journeyapps/powersync-sdk-common@1.3.2

## 0.3.1

### Patch Changes

- 37e266d: Added some serialization checks for broadcasted logs from shared web worker. Unserializable items will return a warning.
- 77b3078: Reduce JS bundle size
- 37e266d: Fixed issue where SyncBucketStorage logs would not be broadcasted from the shared sync worker to individual tabs.
- Updated dependencies [37e266d]
- Updated dependencies [77b3078]
  - @journeyapps/powersync-sdk-common@1.3.1

## 0.3.0

### Minor Changes

- 1aed928: Fix PowerSyncBackendConnector.fetchCredentials type to allow returning null
- aede9e7: Improved multiple tab syncing by unloading stream and sync bucket adapter functionality to shared webworker.

### Patch Changes

- Updated dependencies [1aed928]
- Updated dependencies [aede9e7]
  - @journeyapps/powersync-sdk-common@1.3.0

## 0.2.3

### Patch Changes

- e472f17: Change to use lib instead of dist build folder

## 0.2.2

### Patch Changes

- 69592d0: Fixed issue on NextJS 14.1.0 where shared sync web worker would fail to initialize.
- Updated dependencies [1229e52]
- Updated dependencies [69592d0]
- Updated dependencies [69592d0]
  - @journeyapps/powersync-sdk-common@1.2.2

## 0.2.1

### Patch Changes

- Updated dependencies [a0e739e]
  - @journeyapps/powersync-sdk-common@1.2.1

## 0.2.0

### Minor Changes

- d20386c: Updated common SDK. Changes <https://github.com/powersync-ja/powersync-js/pull/46>

## 0.1.3

### Patch Changes

- 412937f: Fixed watched queries not updating due to race condition when opening multiple WA-SQLite connections due to initiating multiple PowerSync instances simultaneously.

## 0.1.2

### Patch Changes

- 7fb9df2: Fix bug where opening multiple WA-SQLite instances would erase DB table change watches.
- 7fb9df2: Update common SDK dependency to v1.0.1: Improved connector CRUD uploads to be triggered whenever an internal CRUD operation change is triggered. Improved CRUD upload debouncing to rather use a throttled approach - executing multiple continuous write/CRUD operations will now trigger a connector upload at most (every) 1 second (by default).

## 0.1.1

### Patch Changes

- 0e17713: Added ignore directives for Vite to enable bundling the workers correctly.

## 0.1.0

### Minor Changes

- 1fa25e6: Added mock SSR implementation for sync stream client.
  Added better worker and multiple tabs support.
  Added support for Android (without multiple tab support).
  Fixed race conditions in Safari by disabling Shared web workers (multiple tab support).

## 0.0.3

### Patch Changes

- 0bc3758: Improved Server Side Rendering support: Client now does not throw exceptions if used Server Side. DB calls will return empty results, allowing pages to be constructed server side and hydrated with data on the client side.

  Improved TypeScript typings from `@journeyapps/wa-sqlite`.

## 0.0.2

### Patch Changes

- 5d9cbb9: Update package readme

## 0.0.1

### Patch Changes

- af78f76: Initial Alpha version
