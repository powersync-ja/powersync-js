---
'@powersync/op-sqlite': minor
---

Fixed single write transaction operations in `ps_crud` not being processed. Batching update notifications per write lock.
This will also fix downstream features such as watched queries and reactive query hooks in cases where the query is fired before the data was committed, and batching will improve performance specifically in cases where a lot of data changes occur. 
