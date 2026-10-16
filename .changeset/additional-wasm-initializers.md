---
'@powersync/web': minor
---

Add `additionalInitializationFunctions` to web database open options. Custom wa-sqlite builds can export no-argument initialization functions for statically linked extensions, which are called after the PowerSync core initializer and before opening SQLite connections. A nonzero result aborts initialization.
