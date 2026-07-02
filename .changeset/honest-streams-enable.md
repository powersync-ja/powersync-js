---
'@powersync/tanstack-react-query': patch
---

Respect the user-provided `enabled` option in `useQuery` and `useQueries` instead of overriding it. Queries backed by sync streams now pause via TanStack's `skipToken` until their streams have synced, leaving `enabled` fully under the caller's control (`useSuspenseQuery` always runs, since suspense rejects `skipToken`). Also fixes a stale `streamsHaveSynced` value and a race where rows written while a query's source tables were still being resolved could be missed.
