# @journeyapps/powersync-sdk-common

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
