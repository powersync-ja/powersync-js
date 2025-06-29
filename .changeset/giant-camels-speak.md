---
'@powersync/common': minor
'@powersync/node': minor
'@powersync/web': minor
---

PowerSyncDatabase.onChange does a best effort to provide the table name, DML operation, and rowid in the change event. Previously, only table names were emitted.
