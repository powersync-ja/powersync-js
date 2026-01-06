---
'@powersync/common': minor
---

- Improved serializing of upload and download errors for SyncStatus events. Some JS `Error`s are not cloneable, the JSON representation of a SyncStatus should now always be cloneable.
