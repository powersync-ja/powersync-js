---
'@powersync/common': minor
'@powersync/shared-internals': patch
---

Time out checkpoint requests after `checkpointRequestTimeoutMs` (default 40s) and cancel them on disconnect, so an unresponsive service no longer stalls uploads.
