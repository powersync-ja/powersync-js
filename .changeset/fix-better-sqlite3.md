---
"@powersync/node": patch
---

Fix loading of `better-sqlite3` in the Node worker so the module is dynamically loaded correctly.

This ensures the Node SDK loads the correct Database constructor when `better-sqlite3` is installed.
