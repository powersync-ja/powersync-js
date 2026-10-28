---
'@powersync/common': minor
'@powersync/shared-internals': patch
---

Add `connectTimeoutMs` (default 30s) to time out checkpoint requests and HTTP sync stream connections, and cancel checkpoint requests on disconnect.
