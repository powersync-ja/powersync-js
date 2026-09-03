# @powersync/shared-internals

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
