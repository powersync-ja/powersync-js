---
'@powersync/capacitor': patch
---

The `PowerSyncDatabase.connect` method now defaults to using NDJSON-HTTP as the connection method when using the Capacitor Community SQLite driver. This avoids slow binary processing present in Capacitor Community SQLite and should significanly increase sync performance on native platforms.
