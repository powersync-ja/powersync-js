---
'@powersync/shared-internals': patch
---

Fixed an issue where the upload loop could stop with a local write still queued. When `updateLocalTarget` saw a CRUD entry that the preceding queue read had missed, the loop discarded that information and parked, blocking uploads and downloads until the next local write. It now retries, throttled by `crudUploadThrottleMs`.
