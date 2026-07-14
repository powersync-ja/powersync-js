---
'@powersync/react-native': patch
---

Flush table update notifications on commit instead of at `writeLock` release, fixing notifications being lost for synchronous writes on the raw write connection (e.g. `executeSync`) and for committed writes followed by a rollback in the same lock.
