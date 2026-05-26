---
'@powersync/common': patch
---

Attempt a CRUD upload everytime `connect()` is called, even if we're unable to connect.
