---
'@powersync/common': minor
---

Fix `createDiffTrigger` acquiring its own read lock before running setup, even when a `setupContext` was provided.
On platforms where read and write access share a single connection (e.g. web), this deadlocked when `createDiffTrigger` was called inside a write lock.
