---
'@powersync/web': patch
---

No longer awaiting when aborting connection on tab closure. Fixes some edge cases where multiple tabs with OPFS/Safari can cause deadlocks.
