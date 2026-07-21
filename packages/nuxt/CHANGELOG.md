# @powersync/nuxt

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
