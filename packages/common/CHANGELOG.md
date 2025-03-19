# @powersync/common

## 1.25.0

### Minor Changes

- 3c595af: Support bucket priorities

### Patch Changes

- 76dfb06: Changed priorityStatusEntries() to no longer depend on toSorted(), which isn't natively available in React-Native.
- fe98172: Fixed race condition in async closing of databases
- 85f0228: Raise minimum version of core extension to 0.3.11

## 1.24.0

### Minor Changes

- 893d42b: Introduced `fetchStrategy` option to connect, allowing you to choose either `buffered` or `sequential` for the Websocket connect option. Internally the functionality of `buffered` was used by default, but now it can be switched to the sequential mode. This changes the WebSocket sync queue to only process one sync event at a time, improving known keep-alive issues for lower-end hardware with minimal impact on sync performance.
- 0606ac2: add 'connecting' flag to SyncStatus

## 1.23.0

### Minor Changes

- 0f28fb3: Add `retryDelayMs` and `crudUploadThrottleMs` to `connect` so that the values can be dynamically changed upon reconnecting.

## 1.22.2

### Patch Changes

- 2c86114: Update powersync-sqlite-core to 0.3.8 - Increase limit on number of columns per table to 1999.

## 1.22.1

### Patch Changes

- 7a47778: Fix issue where local changes could be reverted when a replication delay is present.
- 4a262cd: Add schema validation

## 1.22.0

### Minor Changes

- 77a9ed2: Added `compilableQueryWatch()` utility function which allows any compilable query to be watched.

## 1.21.0

### Minor Changes

- 7b49661: Updated watch functions to recalculate depedendent tables if schema is updated.

## 1.20.2

### Patch Changes

- 96f1a87: Improved `getCrudBatch` to use a default limit of 100 CRUD entries.

## 1.20.1

### Patch Changes

- 79d4211: Handle additional forward slash in the POWERSYNC_URL environment variable

## 1.20.0

### Minor Changes

- 77e196d: Use powersync-sqlite-core 0.3.0 - faster incremental sync

## 1.19.0

### Minor Changes

- 9dea1b9: Deprecated `rawTableNames` field in `SQLWatchOptions`. All tables specified in `tables` will now be watched, including PowerSync tables with prefixes.

## 1.18.1

### Patch Changes

- 944ee93: Fixed issue where sequentially mutating the same row multiple times could cause the CRUD upload queue monitoring to think CRUD operations have not been processed correctly by the `BackendConnector` `uploadData` method.
- 245bef5: Ensuring sourcemaps are not included for packages.

## 1.18.0

### Minor Changes

- 7428f39: Remove lodash dependency.
- 367d65d: Correctly identify @powersync/common as an ES module

### Patch Changes

- 02f0ce7: Updated dependencies.

## 1.17.0

### Minor Changes

- 447f979: Improve performance of MOVE and REMOVE operations.
- b1a76b3: Fixed SSR Mode detection for DB adapters. Removed the potential for SSR Web Streamining implementations from to perform syncing operations.
- f202944: Merge `Table` and `TableV2` but kept `TableV2` to avoid making this a breaking change.
- 447f979: Add custom x-user-agent header and client_id parameter to requests.
- 447f979: Emit update notifications on `disconnectAndClear()`.
- 447f979: Persist lastSyncedAt timestamp.

### Patch Changes

- e77b1ab: Add a check for maximum number of columns allowed
- 447f979: Always cast `target_op` (write checkpoint) to ensure it's an integer.
- 447f979: Validate that the powersync-sqlite-core version number is in a compatible range of ^0.2.0.

## 1.16.2

### Patch Changes

- 9521e24: Change internals of `deleteBucket` to use simpler action
- 7d04f74: Added basic validations for required options in `PowerSyncDatabase` constructor.
- 4fc1de3: Allow enums to be accessed at runtime by adding `preserveConstEnums` to tsconfig

## 1.16.1

### Patch Changes

- 7668495: Correctly resetting hasSynced value upon a disconnectAndClear call.

## 1.16.0

### Minor Changes

- 042589c: Added a warning if connector `uploadData` functions don't process CRUD items completely.

## 1.15.0

### Minor Changes

- 02ae5de: Prebundling common package with the aim of reducing the need for polyfills.

### Patch Changes

- 32e342a: Fix: correctly apply SQLOpen flags. This fixes an issue where `PowerSyncDatabase` constructor `flags` options were not used when opening SQLite connections in web.

## 1.14.0

### Minor Changes

- 05f3dbd: Add debugMode flag to log queries on the performance timeline

## 1.13.1

### Patch Changes

- 44c568b: Fix issue where WebSockets might not close under some error conditions.

## 1.13.0

### Minor Changes

- dca599f: Improved constructor behavior of `PowerSyncDatabase` and logic for open factories. Deprecated `RNQSPowerSyncDatabaseOpenFactory` and `WASQLitePowerSyncDatabaseOpenFactory`.

## 1.12.0

### Minor Changes

- 590ee67: Added initial support for client parameters. These parameters can be specified as part of the `connect` method's options object.

## 1.11.1

### Patch Changes

- 1b66145: Fixed CRUD uploads which would not retry after failing until the connection status was updated. A failed CRUD operation should not change the status to `connected: false`.

## 1.11.0

### Minor Changes

- 820a81d: [internal] Added ability to provide fetch implementation via FetchImplementationProvider

## 1.10.0

### Minor Changes

- 32dc7e3: Added a mechanism for throttling watch callback executions.

## 1.9.0

### Minor Changes

- 62e43aa: Improved import and usage of BSON library.

## 1.8.1

### Patch Changes

- f5e42af: Introduced base tsconfig. SourceMaps are now excluded in dev and release publishes.

## 1.8.0

### Minor Changes

- 9d1dc6f: Added support for WebSocket sync stream connections.

### Patch Changes

- 395ea24: Remove uuid dependency

## 1.7.1

### Patch Changes

- 3c421ea: Fix hasSynced to change when there is no data on app load

## 1.7.0

### Minor Changes

- c94be6a: Allow compilable queries to be used as hook arguments

### Patch Changes

- 2f1e034: Fix type of Schema.tables
- 21801b9: Fix disconnectAndClear() not clearing ps_untyped

## 1.6.1

### Patch Changes

- b902077: Updated UUID dependency.
- ffe37cf: Update package names from @journey-apps/powersync- to @powersync/
- f9b9a96: Fixed default onError callback for watch() and onChange() that used an unbounded member.

## 1.6.0

### Minor Changes

- 3aaee03: Added support for Full text search out of the box and enabled recursive triggers.

## 1.5.1

### Patch Changes

- 8cc1337: Resolving tables for watch() before handling any results, eliminating a potential race condition between initial result and changes. Also handling a potential uncaught exception.

## 1.5.0

### Minor Changes

- 8f7caa5: Added batch execution functionality to the web and react-native SDKs. This feature allows a SQL statement with multiple parameters to be executed in a single transaction, improving performance and consistency.

### Patch Changes

- 6c43ec6: Fixed potential unhandled exception when aborting stream fetch request for `/sync/stream` endpoint

## 1.4.0

### Minor Changes

- fd7ebc8: Introduced overloaded versions of watch and onChange methods to support a callback approach to handle results and errors alongside the existing AsyncGenerator mechanism.

## 1.3.2

### Patch Changes

- 8fc2164: Fixed regression where watched queries would update for table changes in external (not in query) tables.

## 1.3.1

### Patch Changes

- 37e266d: Fixed issue where sync stream exceptions would not close previous streaming connections.
- 77b3078: Reduce JS bundle size

## 1.3.0

### Minor Changes

- 1aed928: Fix PowerSyncBackendConnector.fetchCredentials type to allow returning null

### Patch Changes

- aede9e7: Internally moved crud upload watching to `SqliteBucketStorageAdapter`. Added `dispose` methods for sync stream clients and better closing of clients.

## 1.2.2

### Patch Changes

- 1229e52: Fixed minor bugs in BucketStorage adapter.
- 69592d0: Improve `AbstractPowerSyncDatabase.getCrudBatch` should use a `getAll` instead of using `database.execute`.
- 69592d0: Removed `object-hash` package as a dependency as this caused issues with NextJs 14.1.0.
  Added `equals` method on `CrudEntry` class to better align comparison operations with Javascript.

## 1.2.1

### Patch Changes

- a0e739e: Fixed missing `transactionId` value in crud transaction response.

## 1.2.0

### Minor Changes

- dd13da4: Added `viewName` option to Schema Table definitions. This allows for overriding a table's view name.

### Patch Changes

- dd13da4: Improved table change updates to be throttled on the trailing edge. This prevents unnecessary query on both the leading and rising edge.

## 1.1.0

### Minor Changes

- 6983121: Added the ability to receive batched table updates from DB adapters.

## 1.0.1

### Patch Changes

- 9bc088d: Improved connector CRUD uploads to be triggered whenever an internal CRUD operation change is triggered. Improved CRUD upload debouncing to rather use a throttled approach - executing multiple continous write/CRUD operations will now trigger a connector upload at most (every) 1 second (by default).

## 1.0.0

### Major Changes

- c665b3f: - Bump version out of Beta
  - The SyncStatus now includes the state of if the connector is uploading or downloading data.
  - Crud uploads are now debounced.
  - Crud uploads now are also triggered on `execute` method calls.
  - Database name is now added to the `DBAdapter` interface for better identification in locks (for Web SDK)
  - Failed crud uploads now correctly throw errors, to be caught upstream, and delayed for retry.

## 0.1.4

### Patch Changes

- 80441ca: Added `raw-data:true` to PowerSync instance streaming requests. This aides with server and client side OplogEntry processing.
- 1b612d7: Fixed streaming sync implementation not delaying CRUD upload retries.

## 0.1.3

### Patch Changes

- ba982eb: Fixed regression where `waitForReady` would not trigger or resolve if not invoked before `init`

## 0.1.2

### Patch Changes

- 280ab96: - Removed `user-id` header from backend connector and remote headers.
  - Added `waitForReady` method on PowerSyncDatabase client which resolves once initialization is complete.

## 0.1.1

### Patch Changes

- 2032643: Fix `Table.createLocalOnly` to not also be `insertOnly`

## 0.1.0

### Minor Changes

- 210de9d: Bump version for Beta release

## 0.0.2

### Patch Changes

- ca458d3: Updated logic to correspond with React Native Quick SQLite concurrent transactions. Added helper methods on transaction contexts.

  API changes include:

  - Removal of synchronous DB operations in transactions: `execute`, `commit`, `rollback` are now async functions. `executeAsync`, `commitAsync` and `rollbackAsync` have been removed.
  - Transaction contexts now have `get`, `getAll` and `getOptional` helpers.
  - Added a default lock timeout of 2 minutes to aide with potential recursive lock/transaction requests.

- b125f75: Use default timeout in post streaming warning message. Update connectivity status on streaming messages.
- ab9957b: Fix update trigger for local only watched tables.
- 413a4d0: Added better logging of streaming errors. Added warnings if Polyfills are not correctly configured.

## 0.0.1

### Patch Changes

- aad52c8: Updated watched queries to trigger for local only tables.
- 822bab9: Bump version to exit prerelease mode. Update SDK readme with known issues.

## 0.0.1-alpha.1

### Patch Changes

- aad52c8: Updated watched queries to trigger for local only tables.
