---
'@powersync/react': patch
---

- Fixed bug where the `useQuery` reported `error` state would not clear after updating the query to a valid query.
- Fixed bug where `useQuery` `isFetching` status would not immediately be reported as true when the query has changed.
