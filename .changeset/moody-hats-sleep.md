---
'@powersync/common': patch
---

Use addEventListener instead of overwriting the onabort property, preventing interference with outside users also setting the property on the same signal. Remove event listener when race settles to avoid memory leak.
