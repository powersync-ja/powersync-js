---
'@powersync/drizzle-driver': minor
---

Added `watch()` function to support watched queries. This function invokes `execute()` on the Drizzle query which improves support for complex queries such as those which are relational.
