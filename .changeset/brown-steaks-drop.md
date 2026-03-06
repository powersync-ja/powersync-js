---
'@powersync/common': minor
---

Added `manageDestinationExternally` option to diff trigger creation, escaping all internal management of the destination table. User is responsible for table creation and cleanup. Added `createDiffDestinationTable` helper method to ease the external creation step.
