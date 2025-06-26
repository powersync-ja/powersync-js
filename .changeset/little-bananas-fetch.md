---
'@powersync/common': minor
---

- Added additional listeners for `closing` and `closed` events in `AbstractPowerSyncDatabase`.
- Added `incrementalWatch` API for enhanced watched queries.
- Added `triggerImmediate` option to the `onChange` API. This allows emitting an initial event which can be useful for downstream use cases.
