---
'@powersync/shared-internals': patch
---

Fix `connect()` and `disconnect()` hanging on React Native when a WebSocket sync connection is closed or aborted before it has opened.
