---
'@powersync/shared-internals': patch
'@powersync/web': patch
---

Fix `disconnect()` and subsequent `connect()` calls hanging on pending shared-worker upload or checkpoint connector calls.

The worker now stops waiting for `uploadCrud` and `postCheckpointRequest` when their sync abort signal fires.
