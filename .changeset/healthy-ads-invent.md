---
'@powersync/react': patch
---

Calling `refresh` on a `useQuery` with `runQueryOnce` no longer resets `isLoading`, it only sets `isFetching` while the query runs again.
