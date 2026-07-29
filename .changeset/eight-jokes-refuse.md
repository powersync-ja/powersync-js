---
'@powersync/shared-internals': patch
---

Fix `connect()` transiently reporting a sync status without core state (`hasSynced: undefined`, no
stream subscriptions), clobbering the offline sync status restored when the database was opened.
Also fix aborted or failed connection attempts resetting the restored status the same way before
the core extension had reported a status for them.
