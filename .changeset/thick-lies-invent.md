---
'@powersync/common': minor
---

Added `fetchOptions` to AbstractRemoteOptions. Allows consumers to include fields such as `dispatcher` (e.g. for proxy support) to the fetch invocations.
Also ensuring all options provided to `connect()` are passed onwards, allows packages to have their own option definitions for `connect()` and the abstract `generateSyncStreamImplementation()`.
