---
'@powersync/common': patch
---

Allow `PowerSyncCredentials.expiresAt` to be explicitly set to `undefined`.

`fetchCredentials` implementations compiled with `exactOptionalPropertyTypes` can now return
`{ endpoint, token, expiresAt: undefined }` without a type error.
