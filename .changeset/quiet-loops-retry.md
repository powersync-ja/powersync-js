---
'@powersync/shared-internals': patch
---

Keep the sync loop retrying when an iteration rejects with `undefined` or `null` after a connection change, instead of stopping with a `TypeError`.
