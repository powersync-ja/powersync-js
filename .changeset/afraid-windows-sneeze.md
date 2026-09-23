---
'@powersync/web': patch
---

Fix a regression from `@powersync/web` version `2.4.0` where `WASQLiteVFS.OPFSWriteAheadVFS` would use larger write-ahead logs than intended.
