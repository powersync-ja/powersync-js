---
'@powersync/op-sqlite': minor
---

Fixed single write transaction operations in `ps_crud` not being processed. Batching update notifications per write lock.
This will also affect/fix downstream features such as watched queries and reactive query hooks.
