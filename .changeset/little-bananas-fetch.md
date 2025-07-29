---
'@powersync/common': minor
---

- Added additional listeners for `closing` and `closed` events in `AbstractPowerSyncDatabase`.
- Added `query` and `customQuery` APIs for enhanced watched queries.
- Added `triggerImmediate` option to the `onChange` API. This allows emitting an initial event which can be useful for downstream use cases.
