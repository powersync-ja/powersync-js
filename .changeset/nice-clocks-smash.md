---
'@powersync/nuxt': patch
---

Use shallowRef instead of ref for database instance to prevent DataCloneError in shared worker communication
