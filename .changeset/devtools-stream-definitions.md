---
'@powersync/diagnostics-core': patch
'@powersync/diagnostics-ui': patch
'@powersync/diagnostics': patch
---

A host that has the deployed Sync Config can pass its Sync Streams as `streamDefinitions` in `getInfo`. The Streams tab suggests them in its subscribe form and shows the parameters each one reads.
