---
'@powersync/react': patch
---

Fixed regression in useSuspendingQuery where `releaseHold is not a function` could be thrown during hot reload or if the WatchedQuery `loading` state resolved before the first re-render.
