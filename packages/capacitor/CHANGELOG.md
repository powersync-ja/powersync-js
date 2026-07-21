# @powersync/capacitor

## 1.0.0

### Minor Changes

- ce608a0: Refactor open and sync options:
  - Sync options are now represented through the `SyncOptions` interface alone, which
    replaces `PowerSyncConnectionOptions` and several other existing types.
    Sync options are only set on the call to `connect()`, and can no longer be set when
    constructing a database.
    `SyncOptions` is the same type across all SDKs, SDK-specific options need to be specified
    when opening a database.
  - Refactor open options: Each SDK has its own option type (but most use `PowerSyncDatabaseOptions`).
    Using a custom open factory or an existing `DBAdapter` instance now requires the `factory` and
    `opened` key, respectively (previously these options shadowed the `database` field).
    On the web, all options that previously required a `WASQLiteOpenFactory` are now available on
    `database` too.
    Also on the web, all database open options are represented via `WebSQLOpenOptions`. Additional
    options related to the sync process have moved to the `WebSpecificOptions` type to separate those
    concerns better.
  - Aligning the implementation with the public documentation, the default connection method has changed
    from WebSockets to HTTP.

  As a small guide on how to upgrade, consider these examples:

  ```TypeScript
  // Before: Sync options set on database constructor
  new PowerSyncDatabase({database: { dbFilename: 'test.db' }, retryDelayMs: 1000});

  // After: Sync options can only be set when connecting
  const db = new PowerSyncDatabase({database: { dbFilename: 'test.db' }});
  await db.connect(yourConnector, { retryDelayMs: 1000 });
  ```

  ```TypeScript
  // Before: Using a custom factory
  new PowerSyncDatabase({database: new OPSqliteOpenFactory({ dbFilename: 'test.db' })});

  // After: Option renamed to factory
  new PowerSyncDatabase({factory: new OPSqliteOpenFactory({ dbFilename: 'test.db' })});
  ```

  ```TypeScript
  // Before (web specific): Using WASQLiteOpenFactory to specify a custom VFS
  new PowerSyncDatabase({
    schema: AppSchema,
    database: new WASQLiteOpenFactory({
      dbFilename: 'exampleVFS.db',
      vfs: WASQLiteVFS.OPFSWriteAheadVFS,
      additionalReaders: 2
    })
  });

  // After: Options are available on database variant, factory no longer necessary
  new PowerSyncDatabase({
    schema: AppSchema,
    database: {
      dbFilename: 'exampleVFS.db',
      vfs: WASQLiteVFS.OPFSWriteAheadVFS,
      additionalReaders: 2
    }
  });
  ```

  ```TypeScript
  // Before (web specific): Misc options in flags field
  new PowerSyncDatabase({
    schema: AppSchema,
    database: { dbFilename: 'test.db' },
    flags: { broadcastLogs: true, disableSSRWarning: true }
  });

  // After: Flags moved to more specific keys.
  new PowerSyncDatabase({
    schema: AppSchema,
    database: {
      dbFilename: 'test.db',
      disableSSRWarning: true,
    },
    broadcastLogs: true,
  });
  ```

- 57373f9: Remove the deprecated table v1 syntax. To create tables based on column arrays, use the new ResolvedTable class.
- 299adaf: Remove `SQLOnChangeOptions.rawTableNames` and `WatchOnChangeHandler.onError` - both were already ignored before.
- 5650e7f: Rename `AbstractPowerSyncDatabase` to `CommonPowerSyncDatabase`, make it a TypeScript interface.

  `CrudEntry` is now a TypeScript interface, remove it's constructor and `CrudEntry.fromRow`.

  `SyncStatus` is no longer constructable in user code.

  Deprecate `DataFlowStatus`. Use fields on `SyncStatus` directly instead.

- 2c3370d: Make `DBAdapter` and `LockContext` abstract classes, refactor `QueryResult` to provide column names and raw data.

### Patch Changes

- Updated dependencies [ce608a0]
- Updated dependencies [97358d0]
- Updated dependencies [57373f9]
- Updated dependencies [299adaf]
- Updated dependencies [5650e7f]
- Updated dependencies [45f4d61]
- Updated dependencies [9caca19]
- Updated dependencies [2c3370d]
- Updated dependencies [6aef3ac]
  - @powersync/web@2.0.0
  - @powersync/shared-internals@1.0.1

## 0.7.0

### Minor Changes

- befa2ae: Promote the Capacitor SDK from alpha to beta.

### Patch Changes

- @powersync/web@1.38.3

## 0.6.1

### Patch Changes

- 7b38faa: Fix Capacitor batch operations so they do not start a nested native transaction when executed inside PowerSync's write transaction wrapper.
  - @powersync/web@1.38.2

## 0.6.0

### Minor Changes

- 4fc12f9: Add Swift Package Manager support for iOS projects.

  This raises the minimum supported Capacitor version to Capacitor 8.

## 0.5.3

### Patch Changes

- c2d0f9e: Update PowerSync SQLite core extension to 0.4.12
- a656afa: The `PowerSyncDatabase.connect` method now defaults to using NDJSON-HTTP as the connection method when using the Capacitor Community SQLite driver. This avoids slow binary processing present in Capacitor Community SQLite and should significantly increase sync performance on native platforms.
- 26c2c24: Fixed "Error in reading buffer" error on iOS when connecting via WebSocket.
- Updated dependencies [1506543]
- Updated dependencies [c2d0f9e]
- Updated dependencies [c730604]
- Updated dependencies [838479e]
- Updated dependencies [739e21a]
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
