---
'@powersync/web': minor
---

- Fixed some edge cases where multiple tabs with OPFS can cause sync deadlocks.
- Fixed issue where calling `powerSync.close()` would cause a disconnect if using multiple tabs (the default should not be to disconnect if using multiple tabs)
- Improved shared sync implementation database delegation and opening strategy.
