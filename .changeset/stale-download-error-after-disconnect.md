---
'@powersync/shared-internals': patch
'@powersync/web': patch
---

Fix a stale `downloadError` of "Disconnect has been requested" being reported after a normal disconnect.

Stopping the sync client on request was recorded as a download failure. Because `downloadError` is only cleared by a completed sync, it then stayed on the status indefinitely whenever no sync completed afterwards. Aborts raised further down, such as a connector call that timed out, are still reported and retried as before.

On the web, the shared worker also kept the last status of a sync implementation after disposing it and handed that status to every tab that connected afterwards, so new tabs could report an error they never encountered. The worker now drops that in-flight state with the implementation, while keeping `hasSynced` and `lastSyncedAt`.
