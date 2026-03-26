---
'@powersync/react': minor
---

Added `useSyncStreams` hook that allows you to manage a variable number of sync streams, compared to the existing `useSyncStream` hook intended for the one and only one use case.
Updated `useSyncStream` and `useAllSyncStreamsHaveSynced` to use this hook internally to simplify their implementations.
