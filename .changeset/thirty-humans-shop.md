---
'@powersync/common': patch
---

Ensuring all options provided to `connect()` are passed onwards, allows packages to have their own option definitions for `connect()` and the abstract `generateSyncStreamImplementation()`.
