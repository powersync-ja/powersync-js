---
'@powersync/op-sqlite': minor
---

Fixed single write transanaction operations in `ps_crud` not being processed. Batching update notifications per write lock.
