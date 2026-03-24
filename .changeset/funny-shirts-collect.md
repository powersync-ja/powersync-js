---
'@powersync/web': minor
---

Refactor database worker communication and lock management.

__Note__: While this is mostly an internal change, it updates how tabs communicate with workers.
Upgrading should not be an issue when using bundlers like vite which add file hashes to worker paths.
If you manually load workers you've copied into your app sources, please make sure the workers
are upgraded along with the SDK. Workers from earlier `@powersync/web` versions will not work
with this release.

__Potentially breaking__: Internal but previously exported classes for low-level connection management have been removed.
