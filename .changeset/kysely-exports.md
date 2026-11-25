---
'@powersync/kysely-driver': patch
---

Export `PowerSyncKyselyDatabase` as a class, and export `PowerSyncDialect` and `PowerSyncDriver` with their option types, so apps can extend the database or build their own Kysely instance on the dialect.
