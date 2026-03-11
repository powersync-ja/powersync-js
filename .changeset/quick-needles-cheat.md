---
'@powersync/common': minor
---

Added `setupContext` option to `CreateDiffTriggerOptions` and a lock context option to the cleanup function returned by `createDiffTrigger`, this allows you to create and dispose of a trigger inside of a lock context.
