---
'@powersync/common': patch
---

Fixed delayed streaming processing, due to a race condition, when connecting via the HTTP connection method (could potentially also affect WebSockets).
