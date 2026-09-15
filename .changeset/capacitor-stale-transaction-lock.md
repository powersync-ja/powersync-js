---
'@powersync/capacitor': patch
---

Fix "database is locked (code 5)" on Android after the webview reloads (for example a live reload) while a write transaction was open. The adapter now rolls back a transaction left open by the previous JS context before closing and re-creating the native connection, so the SQLite file lock is released instead of persisting until the app process is killed.
