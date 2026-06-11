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
