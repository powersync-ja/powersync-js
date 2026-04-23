---
'@powersync/capacitor': patch
---

Normalize binary SQLite parameters for Capacitor iOS so `Uint8Array` sync payloads can be passed through `powersync_control(...)` without hitting `Error in reading buffer`.
