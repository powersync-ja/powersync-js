---
'@powersync/kysely-driver': minor
---

Added `watch()` function to Kysely wrapper to support watched queries. This function invokes `execute()` on the Kysely query which improves support for complex queries and Kysely plugins.
