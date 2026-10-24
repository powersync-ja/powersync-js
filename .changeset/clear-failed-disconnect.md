---
'@powersync/shared-internals': patch
---

Allow connecting and disconnecting again after a disconnect fails. Previously, every later `connect()` and `disconnect()` call rejected with the error of the failed disconnect.
