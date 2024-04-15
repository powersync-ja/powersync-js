---
'@journeyapps/powersync-sdk-common': patch
---

Resolving tables for watch() before handling any results, eliminating a potential race condition between initial result and changes. Also handling a potential uncaught exception.
