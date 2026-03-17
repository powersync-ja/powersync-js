# PowerSync Tauri plugin

## Current limitations

- Connecting to the PowerSync service is only possible from Rust.
  Calling `connect()` from JavaScript will throw.
- For sync status updates, `lastSyncedAt`, `hasSynced` and `priorityStatusEntrie` are unavailable. Use the status from Sync Streams instead.
