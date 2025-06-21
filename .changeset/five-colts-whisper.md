---
'@powersync/op-sqlite': patch
---

Fixed an issue where the default `op-sqlite` database location determination logic was being overridden. The `dbLocation` is now only applied when explicitly provided, resolving issues with features like iOS App Groups.
