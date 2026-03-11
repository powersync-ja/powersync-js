---
'@powersync/common': minor
---

Added `setupContext` option to CreateDiffTriggerOptions and a lock context to the cleanup function returned by createDiffTrigger, this allows you to dispose and recreate a diffTrigger inside a single writeLock.
