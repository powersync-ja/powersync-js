# @powersync/shared-internals

## 1.5.0

### Minor Changes

- d6a9cb4: Support [direct tables](https://docs.powersync.com/client-sdks/advanced/performance-optimization#managed-views-vs-managed-tables).

### Patch Changes

- 325cb95: Add an `sdkName` getter to the database that names the SDK package, for development tooling.
- 7600425: Fix differential watched queries (and `useQuery` with a `rowComparator`) not emitting results when the same rows are returned in a different order.
- d1cec54: Clear `ConnectionManager`'s pending sync implementation creation and disconnect when they fail, so later `disconnect()` and `connect()` calls run again instead of failing on the earlier error.
- 11a6bf3: Keep the sync loop retrying when an iteration rejects with `undefined` or `null` after a connection change, instead of stopping with a `TypeError`.
- 7d5255f: Support version 0.5.4 of the PowerSync SQLite core extension.
- 59f1618: Add `connectTimeoutMs` (default 30s) to time out checkpoint requests and HTTP sync stream connections, and cancel checkpoint requests on disconnect.
- 9fe7e5f: Fix `connect()` and `disconnect()` hanging on React Native when a WebSocket sync connection is closed or aborted before it has opened.
- Updated dependencies [109de2c]
- Updated dependencies [9be90b3]
- Updated dependencies [d6a9cb4]
- Updated dependencies [59f1618]
  - @powersync/common@2.5.0

## 1.4.0

### Minor Changes

- fe8ad22: Wire the core diagnostics event stream into the sync client and keep the active `connector` available for the whole connection lifetime.

### Patch Changes

- 20ea996: Fix `expiresAt` and `lastSyncedAt` on sync stream subscriptions being invalid dates.
- 5a8ed5e: Fix `lastSyncedAt` and `expiresAt` of sync stream subscriptions being `Invalid Date`, since the core extension reports these timestamps in microseconds.
- 1a209a0: Preserve error details across Web worker boundaries, including error codes, HTTP status, causes, and missing rejection reasons.
- Updated dependencies [fe8ad22]
  - @powersync/common@2.4.0

## 1.3.1

### Patch Changes

- 7bae50c: Fix `onChangeWithCallback`, `watchWithCallback`, `compilableQueryWatch`, `AbstractQueryProcessor` and `AttachmentQueue.startSync` leaking listeners when aborted or stopped early (closes #1056, closes #1127).
- Updated dependencies [3d0d5c4]
- Updated dependencies [7bae50c]
  - @powersync/common@2.3.1

## 1.3.0

### Minor Changes

- 9c8f1e3: Add `DisconnectAndClearOptions.soft` to clear data from public tables while keeping an internal sync for a faster next sync.

### Patch Changes

- 7c80576: Fix `disconnect()` never completing in some cases when `checkpointMode` is set to requests.
- 7c80576: Fix `disconnect()` and subsequent `connect()` calls hanging on pending shared-worker upload or checkpoint connector calls.

  The worker now stops waiting for `uploadCrud` and `postCheckpointRequest` when their sync abort signal fires.

- 7c80576: Fix a stale `downloadError` of "Disconnect has been requested" being reported after a normal disconnect.
- Updated dependencies [9c8f1e3]
  - @powersync/common@2.3.0

## 1.2.0

### Minor Changes

- a07998d: Add `requestCheckpoint()` to `PowerSyncDatabase` to request an explicit sync acknowledgement.
  This feature requires a new `checkpointMode: 'requests'` option on `ConnectOptions` switching to a more
  efficient way to request checkpoints from the PowerSync service.

  For more details on this feature, see [Sync Catch-Up](https://docs.powersync.com/client-sdks/advanced/checkpoint-requests).

### Patch Changes

- aa1f171: Fix stream subscription changes made while `connect()` is still bringing up the sync implementation being
  lost until the next reconnect. A stream could keep syncing after being unsubscribed, or be reported as
  subscribed while never being requested, leaving `waitForFirstSync()` unresolved.
- Updated dependencies [a07998d]
  - @powersync/common@2.2.0

## 1.1.1

### Patch Changes

- c787aaf: Declare `@powersync/common` as a peer dependency so the main entry point resolves it under strict `node_modules` layouts.

## 1.1.0

### Minor Changes

- bc50ecc: When shared sync workers are disabled, use broadcast channels to share the current sync status and
  subscriptions across tabs.

### Patch Changes

- 3d1fd84: Update PowerSync SQLite core extension to version 0.5.2.
- 669ba97: Fix `connect()` transiently reporting a sync status without core state (`hasSynced: undefined`, no
  stream subscriptions), clobbering the offline sync status restored when the database was opened.
  Also fix aborted or failed connection attempts resetting the restored status the same way before
  the core extension had reported a status for them.

## 1.0.1

### Patch Changes

- 6aef3ac: Fixed an issue where clients using the HTTP connection method could get stuck in an endless auth-error retry loop when their token expired while disconnected (e.g. after network interruptions or device sleep).
