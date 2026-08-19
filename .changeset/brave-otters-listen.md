---
'@powersync/shared-internals': patch
---

Fix sync stream subscription changes being lost when they happen while `connect()` is still creating the sync
implementation. A `subscribe()` or `unsubscribe()` in that window was silently dropped and never retried, leaving a
stream syncing after nothing was subscribed to it, or a stream that the client reports as subscribed but which is never
requested (so no data arrives and `waitForFirstSync()` never resolves).
