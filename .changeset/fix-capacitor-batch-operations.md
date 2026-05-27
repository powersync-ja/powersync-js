---
'@powersync/capacitor': patch
---

Fix Capacitor batch operations so they do not start a nested native transaction when executed inside PowerSync's write transaction wrapper.
