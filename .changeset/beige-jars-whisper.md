---
'@powersync/react': patch
---

Fixed regression in useSuspendingQuery where `releaseHold is not a function` could be thrown during rendering.
