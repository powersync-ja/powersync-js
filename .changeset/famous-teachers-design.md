---
'@powersync/common': patch
---

Fixed CRUD uploads which would not retry after failing until the connection status was updated. A failed CRUD operation should not change the status to `connected: false`.
