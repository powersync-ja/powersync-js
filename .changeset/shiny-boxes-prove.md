---
'@powersync/common': patch
---

Changed WebSocket sync queue by reducing pending events from 10 to 1, improving known keepalive issues with minimal impact on sync performance.
