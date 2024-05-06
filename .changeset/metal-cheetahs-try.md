---
"@powersync/kysely-driver": minor
---

Made `destroy` and `releaseConnection` no-op functions. If you relied on `destroy` you will need to use `disconnectAndClear` on the PowerSync DB directly.
