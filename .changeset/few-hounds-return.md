---
'@powersync/common': patch
'@powersync/web': patch
---

Fix: correctly apply SQLOpen flags. This fixes an issue where `PowerSyncDatabase` constructor `flags` options were not used when opening SQLite connections in web.
