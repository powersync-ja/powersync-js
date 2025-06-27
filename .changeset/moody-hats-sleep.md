---
'@powersync/common': patch
---

Use addEventListener instead of overwriting the onabort property, which can lead to bugs and race conditions.
