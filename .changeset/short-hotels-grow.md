---
'@powersync/adapter-sql-js': patch
---

Only calling `db.export()` if a persister is specified, otherwise it is no-op. Improves in-memory performance.
