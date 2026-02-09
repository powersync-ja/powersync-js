---
'@powersync/op-sqlite': patch
'@powersync/capacitor': patch
---

Fixed potential issue where extreme amounts of concurrent calls to `writeLock` could reject with the error "Too many pending tasks in queue"
