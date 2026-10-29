---
'@powersync/shared-internals': patch
---

Clear `ConnectionManager`'s pending sync implementation creation and disconnect when they fail, so later `disconnect()` and `connect()` calls run again instead of failing on the earlier error.
