---
'@powersync/common': minor
---

Added `persistDestination` option to diff trigger creation. Allows the destination table to be persisted beyond cleanup of a trigger, also allows the creation to complete even if the destination table already exists.
