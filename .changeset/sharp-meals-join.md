---
'@journeyapps/powersync-sdk-common': patch
---

Improve `AbstractPowerSyncDatabase.getCrudBatch` should use a `readLock` instead of using `database.execute`.
