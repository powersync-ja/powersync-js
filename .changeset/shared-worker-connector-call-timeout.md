---
'@powersync/shared-internals': patch
'@powersync/web': patch
---

Fix `connect()` never resolving when a client tab stops responding to the shared sync worker.

The worker delegates `fetchCredentials`, `uploadCrud` and `postCheckpointRequest` to a client tab over Comlink. A tab can stop servicing its message port without closing it (frozen, in the back/forward cache, or a sync implementation abandoned without being disposed), and these calls had no timeout and were not tied to the sync abort signal, so they could stay pending forever. Because `disconnect()` awaits the sync loops, one stuck call wedged the disconnect and every subsequent `connect()` queued behind it. These calls are now bounded by the abort signal, a timeout, or both.
