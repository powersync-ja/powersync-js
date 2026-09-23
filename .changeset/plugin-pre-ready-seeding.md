---
'@powersync/shared-internals': minor
---

Watched-query plugins are linked before the database is ready, so a plugin seeding from its own storage no longer waits on database startup.
