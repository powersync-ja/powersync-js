---
'@powersync/common': patch
'@powersync/node': patch
---

Fixes an issue where the `readLock` and `writeLock` methods of `AbstractPowerSyncDatabase` shared a common wrapped mutex. This primarily affected the Node.js SDK. The concurrency of individual `get`, `getAll`, and `getOptional` executions was not impacted and functioned correctly prior to this fix.
