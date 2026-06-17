---
'@powersync/react-native': major
'@powersync/web': major
'@powersync/capacitor': minor
'@powersync/common': minor
'@powersync/tauri-plugin': minor
'@powersync/node': minor
'@powersync/nuxt': minor
'@powersync/vue': minor
---

Rename `AbstractPowerSyncDatabase` to `CommonPowerSyncDatabase`, make it a TypeScript interface.

`CrudEntry` is now a TypeScript interface, remove it's constructor and `CrudEntry.fromRow`.

`SyncStatus` is no longer constructable in user code.

Remove `DataFlowStatus.downloading`. Use `SyncStatus.downloading` instead.
