---
'@powersync/react': minor
---

Add `fetchReason` to the `useQuery` result. While `isFetching` is true it is `'initial'`, `'tables-changed'` or `'settings-changed'`, so a parameter change (the previous query's rows are still returned) can be told apart from a refetch of the same query.
