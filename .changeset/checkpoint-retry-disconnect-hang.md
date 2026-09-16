---
'@powersync/shared-internals': patch
---

Fix `disconnect()` never completing when it interrupts the checkpoint request retry delay. Waking the delay let the retry loop wait on a signal that had already been aborted, so it could no longer be notified and never returned. Because `disconnect()` waits for the sync loops to finish, both it and every `connect()` queued behind it stayed pending for the rest of the session. Only affects connections using a `checkpointMode` other than `legacy`.
