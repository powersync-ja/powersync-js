---
'@powersync/shared-internals': patch
---

Fix differential watched queries (and `useQuery` with a `rowComparator`) not emitting results when the same rows are returned in a different order.
