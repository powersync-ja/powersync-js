---
'@journeyapps/powersync-sdk-common': patch
---

- Removed `user-id` header from backend connector and remote headers.
- Added `waitForReady` method on PowerSyncDatabase client which resolves once initialization is complete.