---
'@powersync/react-native': minor
---

Introduced `executeRaw` member to `RNQSDBAdapter` to match `DBAdapter` interface.
It handles SQLite query results differently to `execute` - to preserve all columns, preventing duplicate column names from being overwritten.

The implementation for RNQS will currently fall back to `execute`, preserving current behavior. Users requiring this functionality should migrate to `@powersync/op-sqlite`.
