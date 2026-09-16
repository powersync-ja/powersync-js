---
'@powersync/capacitor': patch
---

Fix "database is locked (code 5)" on Android after the webview reloads (for example a live reload) while a write transaction was open.
