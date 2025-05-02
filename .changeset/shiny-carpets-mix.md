---
'@powersync/web': patch
---

Fix an infinite loop when multiple tabs using `WASQLiteVFS.OPFSCoopSyncVFS` are using the database concurrently.
