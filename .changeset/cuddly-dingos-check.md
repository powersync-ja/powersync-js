---
'@powersync/node': patch
---
Fixed an issue where `readLock` and `writeLock` calls were unnecessarily serialized due to a shared mutex. This did not affect individual calls to `get`, `getAll`, or `getOptional`.
