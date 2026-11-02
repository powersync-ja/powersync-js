# @powersync/nuxt

## 2.1.0

### Minor Changes

- 109de2c: Add `Authenticator` and `MutationUploader` types, and overloads of `connect()` allowing to connect in download-only and upload-only mode.

### Patch Changes

- Updated dependencies [bf54805]
- Updated dependencies [325cb95]
- Updated dependencies [109de2c]
- Updated dependencies [7600425]
- Updated dependencies [d1cec54]
- Updated dependencies [6f05fc7]
- Updated dependencies [9be90b3]
- Updated dependencies [7bb0f27]
- Updated dependencies [11a6bf3]
- Updated dependencies [7d5255f]
- Updated dependencies [d6a9cb4]
- Updated dependencies [d30ad72]
- Updated dependencies [7d5255f]
- Updated dependencies [325cb95]
- Updated dependencies [59f1618]
- Updated dependencies [9fe7e5f]
  - @powersync/web@2.6.0
  - @powersync/shared-internals@1.5.0
  - @powersync/diagnostics@0.0.3
  - @powersync/kysely-driver@2.0.3
  - @powersync/vue@0.7.0

## 2.0.0

### Major Changes

- fe8ad22: **Breaking:** `NuxtPowerSyncDatabase` is removed; use `PowerSyncDatabase` with `connect(connector, { diagnostics: true })`. Diagnostics now come from `@powersync/diagnostics`: a PowerSync tab on Nuxt DevTools 3, the devframe dock with MCP tools on Nuxt DevTools 4.

### Patch Changes

- Updated dependencies [544c9ba]
- Updated dependencies [255456b]
- Updated dependencies [fe8ad22]
- Updated dependencies [20ea996]
- Updated dependencies [fe8ad22]
- Updated dependencies [5a8ed5e]
- Updated dependencies [1a209a0]
  - @powersync/web@2.5.0
  - @powersync/diagnostics@0.0.2
  - @powersync/shared-internals@1.4.0
  - @powersync/kysely-driver@2.0.2
  - @powersync/vue@0.7.0

## 1.0.0

### Patch Changes

- 9c8f1e3: Add `DisconnectAndClearOptions.soft` to clear data from public tables while keeping an internal sync for a faster next sync.
- Updated dependencies [9c8f1e3]
- Updated dependencies [7c80576]
- Updated dependencies [de0879c]
- Updated dependencies [59212f1]
- Updated dependencies [7c80576]
- Updated dependencies [7c80576]
  - @powersync/shared-internals@1.3.0
  - @powersync/vue@0.7.0
  - @powersync/web@2.4.0
  - @powersync/kysely-driver@2.0.2

## 0.1.0

### Minor Changes

- a07998d: Add `requestCheckpoint()` to `PowerSyncDatabase` to request an explicit sync acknowledgement.
  This feature requires a new `checkpointMode: 'requests'` option on `ConnectOptions` switching to a more
  efficient way to request checkpoints from the PowerSync service.

  For more details on this feature, see [Sync Catch-Up](https://docs.powersync.com/client-sdks/advanced/checkpoint-requests).

### Patch Changes

- Updated dependencies [aa1f171]
- Updated dependencies [a07998d]
  - @powersync/shared-internals@1.2.0
  - @powersync/web@2.3.0
  - @powersync/vue@0.6.0
  - @powersync/kysely-driver@2.0.1

## 0.0.9

### Patch Changes

- 3d1fd84: Make `@journeyapps/wa-sqlite` a regular dependency instead of a dev-dependency.
  When upgrading, you can remove that package from your dependencies if you don't import it directly in your project.
- 3d1fd84: Update PowerSync SQLite core extension to version 0.5.2.
- Updated dependencies [3d1fd84]
- Updated dependencies [7f886e4]
- Updated dependencies [3d1fd84]
- Updated dependencies [669ba97]
- Updated dependencies [8d18368]
- Updated dependencies [8d18368]
- Updated dependencies [bc50ecc]
- Updated dependencies [d1b3622]
  - @powersync/web@2.1.0
  - @powersync/kysely-driver@2.0.1
  - @powersync/shared-internals@1.1.0
  - @powersync/vue@0.6.0

## 0.0.8

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
- 5650e7f: Rename `AbstractPowerSyncDatabase` to `CommonPowerSyncDatabase`, make it a TypeScript interface.

  `CrudEntry` is now a TypeScript interface, remove it's constructor and `CrudEntry.fromRow`.

  `SyncStatus` is no longer constructable in user code.

  Deprecate `DataFlowStatus`. Use fields on `SyncStatus` directly instead.

### Patch Changes

- 2c3370d: Make `DBAdapter` and `LockContext` abstract classes, refactor `QueryResult` to provide column names and raw data.
- Updated dependencies [ce608a0]
- Updated dependencies [97358d0]
- Updated dependencies [57373f9]
- Updated dependencies [299adaf]
- Updated dependencies [299adaf]
- Updated dependencies [5650e7f]
- Updated dependencies [45f4d61]
- Updated dependencies [9caca19]
- Updated dependencies [2c3370d]
- Updated dependencies [367ad55]
- Updated dependencies [6aef3ac]
  - @powersync/web@2.0.0
  - @powersync/vue@1.0.0
  - @powersync/kysely-driver@2.0.0
  - @powersync/shared-internals@1.0.1

## 0.0.7

### Patch Changes

- 1506543: Update `@journeyapps/wa-sqlite` dependency.
- c2d0f9e: Update PowerSync SQLite core extension to 0.4.12
- 739e21a: Remove support for the JavaScript sync client. The default Rust client is the only option starting from this version.
- Updated dependencies [1506543]
- Updated dependencies [c2d0f9e]
- Updated dependencies [c730604]
- Updated dependencies [838479e]
- Updated dependencies [739e21a]
- Updated dependencies [756a0cf]
  - @powersync/web@1.38.0
  - @powersync/vue@0.5.1
  - @powersync/kysely-driver@1.3.3

## 0.0.6

### Patch Changes

- 4bb0ad4: Use shallowRef instead of ref for database instance to prevent DataCloneError in shared worker communication
- Updated dependencies [554c177]
  - @powersync/vue@0.5.1
  - @powersync/web@1.37.1
  - @powersync/kysely-driver@1.3.3

## 0.0.5

### Patch Changes

- 8f8ef1c: Remove `async-mutex` dependency in favor of internal implementation.
- Updated dependencies [45f427c]
- Updated dependencies [8f8ef1c]
  - @powersync/web@1.37.0
  - @powersync/vue@0.5.0
  - @powersync/kysely-driver@1.3.3

## 0.0.4

### Patch Changes

- 2f6d9c8: Updated readme.
- Updated dependencies [6c855cd]
  - @powersync/web@1.35.0
  - @powersync/vue@0.5.0
  - @powersync/kysely-driver@1.3.3

## 0.0.3

### Patch Changes

- 0c476f8: Updated readme note to include alpha state.

## 0.0.2

### Patch Changes

- 3807514: Expose Sync Streams comosable to use in Nuxt with auto-imports

  Example:

  ```
  <script setup lang="ts">
  // useSyncStream is auto-imported in Nuxt
  const streamName = ref('my-stream');
  const { status } = useSyncStream(streamName, { parameters: { id: 'abc' } });
  </script>

  <template>
    <div v-if="status?.hasSynced">Stream ready</div>
    <div v-else>Syncing...</div>
  </template>
  ```

- Updated dependencies [fd7f387]
  - @powersync/vue@0.5.0

## 0.0.1

### Patch Changes

- fb19f01: Initial release of the PowerSync Nuxt module. Provides Nuxt Devtools integration, built-in diagnostics and data inspection, and composables. Supports Nuxt 4.
