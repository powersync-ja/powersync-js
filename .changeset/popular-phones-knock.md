---
'@powersync/common': patch
---

Always cast `target_op` (write checkpoint) to ensure it's an integer.
