---
'@powersync/drizzle-driver': minor
---

Using `executeRaw` internally for queries instead of `execute`. This function processes SQLite query results differently to preserve all columns, preventing duplicate column names from being overwritten.
