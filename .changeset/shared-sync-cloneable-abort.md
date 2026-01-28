---
"@powersync/web": patch
---

Use a cloneable abort reason when closing shared sync client ports to avoid DataCloneError across Comlink.
