---
'@powersync/shared-internals': patch
---

Fix a rejected `disconnect()` permanently poisoning later `disconnect()` and `connect()` calls on the same instance.
