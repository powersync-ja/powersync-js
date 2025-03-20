---
'@powersync/op-sqlite': minor
'@powersync/common': minor
'@powersync/node': minor
'@powersync/web': minor
---

Introduced `executeRaw`, which processes SQLite query results differently to preserve all columns, preventing duplicate column names from being overwritten.
