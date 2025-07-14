# @powersync/web

## 1.23.2

### Patch Changes

- Updated dependencies [9b2bde3]
  - @powersync/common@1.33.2

## 1.23.1

### Patch Changes

- b398483: Use `BEGIN EXCLUSIVE` to open write transactions
- ffe3095: Improve websocket keepalive logic to reduce keepalive errors.
- 53236a8: Rust client: Properly upload CRUD entries made while offline.
- d1b7fcb: Rust sync client: Fix reported `lastSyncedAt` values in sync status.
- Updated dependencies [ffe3095]
- Updated dependencies [36d8f28]
- Updated dependencies [53236a8]
- Updated dependencies [b7255b7]
- Updated dependencies [70a9cf5]
- Updated dependencies [d1b7fcb]
  - @powersync/common@1.33.1

## 1.23.0

### Minor Changes

- cbb20c0: This adds a new (and currently experimental) sync client implementation
  implemented natively in the PowerSync SQLite extension.

  This implementation will eventually become the default, but we encourage
  interested users to try it out. In particular, we expect that it can improve
  sync performance (especially on platforms with challenging JS performance,
  like React Native).

  On all our JavaScript SDKs, the new implementation can be enabled with a
  sync option entry when connecting:

  ```JS
  await db.connect(new MyConnector(), {
    clientImplementation: SyncClientImplementation.RUST
  });
  ```

  Since the new client implements the same protocol, you can also migrate back
  to the JavaScript client later by removing the `clientImplementation` option.

  **However**: After enabling the `RUST` client, you cannot downgrade your
  PowerSync SDK below this version. When enabled for the first time, databases
  will be migrated. The JavaScript sync client from this and later SDK versions
  understands the new format, but the client from an older SDK version will not!

### Patch Changes

- 0446f15: Update PowerSync core extension to 0.4.0
- Updated dependencies [cbb20c0]
- Updated dependencies [7e8bb1a]
  - @powersync/common@1.33.0

## 1.22.0

### Minor Changes

- 96ddd5d: Improved behaviour when connect is called multiple times in quick succession. Updating client parameters should now be more responsive.

### Patch Changes

- Updated dependencies [96ddd5d]
- Updated dependencies [96ddd5d]
- Updated dependencies [efc8ba9]
  - @powersync/common@1.32.0

## 1.21.1

### Patch Changes

- Updated dependencies [b046ebe]
  - @powersync/common@1.31.1

## 1.21.0

### Minor Changes

- 0565a0a: To support the upstream credentials management changes from `@powersync/common`, the sync worker now communicates credentials invalidation to tabs.

### Patch Changes

- fccf11e: Fixed issue where broadcast logger wasn't being passed to WebRemote, causing worker remote logs not to be broadcasted to the tab's logs.
- Updated dependencies [0565a0a]
  - @powersync/common@1.31.0

## 1.20.1

### Patch Changes

- Updated dependencies [2949d58]
- Updated dependencies [c30cbef]
  - @powersync/common@1.30.0

## 1.20.0

### Minor Changes

- ed11438: Report progress information about downloaded rows. Sync progress is available through `SyncStatus.downloadProgress`.

### Patch Changes

- 4f68f6a: Update core extension version to 0.3.14
- cbab03e: Fix an infinite loop when multiple tabs using `WASQLiteVFS.OPFSCoopSyncVFS` are using the database concurrently.
- Updated dependencies [ed11438]
  - @powersync/common@1.29.0

## 1.19.0

### Minor Changes

- e71dc94: Removed `js-logger` dependency, using the logger helper exposed by `@powersync/common`.

### Patch Changes

- 6807df6: Updated db and sync workers to respect log levels.
- Updated dependencies [6807df6]
- Updated dependencies [e71dc94]
- Updated dependencies [f40ecf9]
  - @powersync/common@1.28.0

## 1.18.0

### Minor Changes

- be18c65: Determining `node_modules` location via `require.resolve` for the `copy-assets` command. Fixes use cases where `node_modules` location might differ such as in a monorepo.

### Patch Changes

- 7fe70bd: Added VFS database options to externals list in build.

## 1.17.2

### Patch Changes

- Updated dependencies [720ad7a]
  - @powersync/common@1.27.1

## 1.17.1

### Patch Changes

- Updated dependencies [b722378]
  - @powersync/common@1.27.0

## 1.17.0

### Minor Changes

- fafd562: Navigator locks are now aquired with a random/unique key.

  This resolves an issue related to sequential `connect()` calls breaking all syncing and never reaching a `connected` state.
  Two typical scenarios that can cause this is switching client parameters and React's `StrictMode` which does multiple calls of hooks like `useEffect`.

## 1.16.0

### Minor Changes

- f8fd814: Introduced `executeRaw`, which processes SQLite query results differently to preserve all columns, preventing duplicate column names from being overwritten.

### Patch Changes

- f0c49f9: Ensuring encryption pragma executes before setting cache size, fixes issue where encryption would throw an error during initialization.
- Updated dependencies [f8fd814]
  - @powersync/common@1.26.0

## 1.15.1

### Patch Changes

- 0c8ddda: Update package description

## 1.15.0

### Minor Changes

- 26025f0: Ensured OPFS tabs are not frozen or put to sleep by browsers. This prevents potential deadlocks in the syncing process.

## 1.14.2

### Patch Changes

- fe98172: Fixed race condition in async closing of databases
- 17fc01e: Update core PowerSync SQLite extensions to 0.3.12
- Updated dependencies [76dfb06]
- Updated dependencies [3c595af]
- Updated dependencies [fe98172]
- Updated dependencies [85f0228]
  - @powersync/common@1.25.0

## 1.14.1

### Patch Changes

- 44582ef: Fixed bug where using OPFS and reconnecting would cause upload triggers to fail.

## 1.14.0

### Minor Changes

- 56185bb: Add cacheSizeKb option, defaulting to 50MB.

### Patch Changes

- Updated dependencies [893d42b]
- Updated dependencies [0606ac2]
  - @powersync/common@1.24.0

## 1.13.1

### Patch Changes

- Updated dependencies [0f28fb3]
  - @powersync/common@1.23.0

## 1.13.0

### Minor Changes

- 065aba6: Added support for OPFS virtual filesystem.

## 1.12.3

### Patch Changes

- 2c86114: Update powersync-sqlite-core to 0.3.8 - Increase limit on number of columns per table to 1999.
- Updated dependencies [2c86114]
  - @powersync/common@1.22.2

## 1.12.2

### Patch Changes

- Updated dependencies [7a47778]
- Updated dependencies [4a262cd]
  - @powersync/common@1.22.1

## 1.12.1

### Patch Changes

- Updated dependencies [77a9ed2]
  - @powersync/common@1.22.0

## 1.12.0

### Minor Changes

- 36af0c8: Added `temporaryStorage` option to `WebSQLOpenFactoryOptions`. The `temp_store` value will now defaults to "MEMORY".

### Patch Changes

- 7e23d65: Added a bin/cli utilty that can be invoked with `npx powersync-web copy-assets` or `pnpm powersync-web copy-assets`.

## 1.11.0

### Minor Changes

- bacc1c5: Updated WA-SQLite to `@journeyapps/wa-sqlite@1.0.0`. Note that WA-SQLite performed some changes to the virtual filesystem structure in this update. An automatic migration will be executed when upgrading, however no down-migration is available. Downgrading to `@journeyapps/wa-sqlite < 1.0.0` will require the IndexDB storage to be erased.

## 1.10.2

### Patch Changes

- fa26eb4: Update powersync-sqlite-core to 0.3.6 to fix issue with dangling rows

## 1.10.1

### Patch Changes

- e9773d9: Add error check for insecure context

## 1.10.0

### Minor Changes

- 7b49661: Added `refreshSchema()` which will cause all connections to be aware of a schema change.

### Patch Changes

- Updated dependencies [7b49661]
  - @powersync/common@1.21.0

## 1.9.2

### Patch Changes

- 96f1a87: Improved `getCrudBatch` to use a default limit of 100 CRUD entries.
- Updated dependencies [96f1a87]
  - @powersync/common@1.20.2

## 1.9.1

### Patch Changes

- 79d4211: Handle additional forward slash in the POWERSYNC_URL environment variable
- 8554526: chore: Updated minimum WA-SQLite peer dependnency version.
- Updated dependencies [79d4211]
  - @powersync/common@1.20.1

## 1.9.0

### Minor Changes

- 77e196d: Use powersync-sqlite-core 0.3.0 - faster incremental sync

### Patch Changes

- Updated dependencies [77e196d]
  - @powersync/common@1.20.0

## 1.8.2

### Patch Changes

- Updated dependencies [9dea1b9]
  - @powersync/common@1.19.0

## 1.8.1

### Patch Changes

- 944ee93: Fixed issue where sequentially mutating the same row multiple times could cause the CRUD upload queue monitoring to think CRUD operations have not been processed correctly by the `BackendConnector` `uploadData` method.
- 245bef5: Ensuring sourcemaps are not included for packages.
- Updated dependencies [944ee93]
- Updated dependencies [245bef5]
  - @powersync/common@1.18.1

## 1.8.0

### Minor Changes

- 7428f39: Remove lodash dependency.
- 02f0ce7: DB and sync workers instantiation can now be overriden with a path or a factory method. Added UMD distribution to introduce `react-native-web` support (available under `@powersync/web/umd`).

### Patch Changes

- Updated dependencies [02f0ce7]
- Updated dependencies [7428f39]
- Updated dependencies [367d65d]
  - @powersync/common@1.18.0

## 1.7.0

### Minor Changes

- b1a76b3: Fixed SSR Mode detection for DB adapters. Removed the potential for SSR Web Streamining implementations from to perform syncing operations.
- 447f979: Use wa-sqlite 0.3.0 / powersync-sqlite-core 0.2.0.

### Patch Changes

- Updated dependencies [447f979]
- Updated dependencies [b1a76b3]
- Updated dependencies [e77b1ab]
- Updated dependencies [447f979]
- Updated dependencies [f202944]
- Updated dependencies [447f979]
- Updated dependencies [447f979]
- Updated dependencies [447f979]
- Updated dependencies [447f979]
  - @powersync/common@1.17.0

## 1.6.0

### Minor Changes

- 9f95437: Updated default streaming connection method to use WebSockets

### Patch Changes

- 2db0e8f: Debounce update notifications to fix performance issue with large amounts of data synced
- Updated dependencies [9521e24]
- Updated dependencies [7d04f74]
- Updated dependencies [4fc1de3]
  - @powersync/common@1.16.2

## 1.5.1

### Patch Changes

- 58fd059: Fix an issue where the shared sync manager would not discard stale credentials
- Updated dependencies [7668495]
  - @powersync/common@1.16.1

## 1.5.0

### Minor Changes

- 042589c: Added a warning if connector `uploadData` functions don't process CRUD items completely.

### Patch Changes

- Updated dependencies [042589c]
  - @powersync/common@1.16.0

## 1.4.0

### Minor Changes

- 02ae5de: Prebundling dependencies with the aim of reducing the need for polyfills.

### Patch Changes

- 32e342a: Fix: correctly apply SQLOpen flags. This fixes an issue where `PowerSyncDatabase` constructor `flags` options were not used when opening SQLite connections in web.
- Updated dependencies [32e342a]
- Updated dependencies [02ae5de]
  - @powersync/common@1.15.0

## 1.3.0

### Minor Changes

- 05f3dbd: Add debugMode flag to log queries on the performance timeline

### Patch Changes

- 843cfec: revert peer dep change
- Updated dependencies [05f3dbd]
  - @powersync/common@1.14.0

## 1.2.4

### Patch Changes

- Updated dependencies [44c568b]
  - @powersync/common@1.13.1

## 1.2.3

### Patch Changes

- 31c61b9: Change @powersync/common peerDep to ^

## 1.2.2

### Patch Changes

- a1b52be: Fix read statements not using the transaction lock

## 1.2.1

### Patch Changes

- 8d5b702: Silencing transactions that are reporting on failed rollback exceptions when they are safe to ignore.

## 1.2.0

### Minor Changes

- dca599f: Improved constructor behavior of `PowerSyncDatabase` and logic for open factories. Deprecated `RNQSPowerSyncDatabaseOpenFactory` and `WASQLitePowerSyncDatabaseOpenFactory`.

### Patch Changes

- Updated dependencies [dca599f]
  - @powersync/common@1.13.0

## 1.1.0

### Minor Changes

- 590ee67: Added initial support for client parameters. These parameters can be specified as part of the `connect` method's options object.

### Patch Changes

- Updated dependencies [590ee67]
  - @powersync/common@1.12.0

## 1.0.2

### Patch Changes

- Updated dependencies [1b66145]
  - @powersync/common@1.11.1

## 1.0.1

### Patch Changes

- Updated dependencies [820a81d]
  - @powersync/common@1.11.0

## 1.0.0

### Major Changes

- 32dc7e3: Bump version for Stable release.

### Patch Changes

- e86e61d: Update PowerSync branding
- Updated dependencies [32dc7e3]
  - @powersync/common@1.10.0

## 0.8.1

### Patch Changes

- c3f29a1: Created a fix to resolve the issue where watched queries would not update after syncing upstream changes

## 0.8.0

### Minor Changes

- 7943626: Allow package to be used without web workers

### Patch Changes

- 48cc01c: Reinclude common package as a dependency

## 0.7.0

### Minor Changes

- 62e43aa: Improved import and usage of BSON library.

### Patch Changes

- 6b01811: Add @powersync/common as peer dependency
- Updated dependencies [62e43aa]
  - @powersync/common@1.9.0

## 0.6.1

### Patch Changes

- f5e42af: Introduced base tsconfig. SourceMaps are now excluded in dev and release publishes.
- Updated dependencies [f5e42af]
  - @powersync/common@1.8.1

## 0.6.0

### Minor Changes

- 9d1dc6f: Added support for WebSocket sync stream connections.

### Patch Changes

- 395ea24: Remove uuid dependency
- Updated dependencies [395ea24]
- Updated dependencies [9d1dc6f]
  - @powersync/common@1.8.0

## 0.5.3

### Patch Changes

- Updated dependencies [3c421ea]
  - @powersync/common@1.7.1

## 0.5.2

### Patch Changes

- Updated dependencies [c94be6a]
- Updated dependencies [2f1e034]
- Updated dependencies [21801b9]
  - @powersync/common@1.7.0

## 0.5.1

### Patch Changes

- ffe37cf: Update package names from @journey-apps/powersync- to @powersync/
- Updated dependencies [b902077]
- Updated dependencies [ffe37cf]
- Updated dependencies [f9b9a96]
  - @powersync/common@1.6.1

## 0.5.0

### Minor Changes

- 3aaee03: Added support for Full text search out of the box and enabled recursive triggers.

### Patch Changes

- Updated dependencies [3aaee03]
  - @journeyapps/powersync-sdk-common@1.6.0

## 0.4.1

### Patch Changes

- Updated dependencies [8cc1337]
  - @journeyapps/powersync-sdk-common@1.5.1

## 0.4.0

### Minor Changes

- 8f7caa5: Added batch execution functionality to the web and react-native SDKs. This feature allows a SQL statement with multiple parameters to be executed in a single transaction, improving performance and consistency.

### Patch Changes

- 6c43ec6: Fixed shared sync broadcast logger sanitization and error handling. Added ability to disabled broadcast logging in `WebPowerSyncFlags`.
- Updated dependencies [8f7caa5]
- Updated dependencies [6c43ec6]
  - @journeyapps/powersync-sdk-common@1.5.0

## 0.3.3

### Patch Changes

- Updated dependencies [fd7ebc8]
  - @journeyapps/powersync-sdk-common@1.4.0

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
