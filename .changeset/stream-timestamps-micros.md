---
'@powersync/shared-internals': patch
---

Fix `lastSyncedAt` and `expiresAt` of sync stream subscriptions being `Invalid Date`, since the core extension reports these timestamps in microseconds.
