---
'@powersync/diagnostics-core': minor
'@powersync/diagnostics': patch
---

Add the logic a diagnostics host needs on top of the protocol, and a headless web test client.

The main entrypoint gains SDK-free helpers: `readSyncConfigParameters` (what a Sync Config expects of clients), `parseStreamBucketName` and `collectStreamStats` (buckets to streams), `readTableStats` / `readBucketStats` / `readStoredSubscriptions` (over `runQuery`), `collectImpersonationTarget` and `recoverSubscriptions` (a session recovered from service logs), `ObservedSchema` (a schema inferred from core `SchemaChange` events), and small token, log and SQL helpers. `./js` gains `BroadcastCoreEvents`.

A new `./web` entrypoint, with `@powersync/web` as an optional peer, exports `openDiagnosticsSession`: a headless PowerSync client served as an `SdkIntegration` in-process, with a choice of VFS (OPFS by default), fast `reset()` / `deleteDatabaseFiles` that remove the database's files instead of clearing it row by row, and `unsubscribeAll`. A session for another user or instance deletes the files the same way, before it opens the database, and a database that cannot be shown to belong to the session is not reused.

The protocol's `unsubscribeStream` takes `mode: 'all'` to drop every subscription to a stream rather than start its TTL, and a new `unsubscribeAllStreams` action drops every runtime subscription. `createDiagnosticsStores` takes `maxLogs`, and `withRequestTimeout` bounds requests to an integration whose other side has gone. `@powersync/diagnostics` validates actions against the protocol's own `ACTION_NAMES`, so the new action and `mode` pass its RPC boundary.
