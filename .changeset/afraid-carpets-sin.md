---
'@powersync/common': major
'@powersync/web': major
'@powersync/capacitor': minor
'@powersync/node': minor
'@powersync/nuxt': minor
'@powersync/tauri-plugin': patch
---

Refactor open and sync options:

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
