---
'@powersync/nuxt': minor
---

Unify diagnostics with the other PowerSync hosts: the Nuxt DevTools tab now shows the shared diagnostics UI, served by `@powersync/diagnostics-vite` outside the app's router so it needs no app configuration. `NuxtPowerSyncDatabase` is removed; use `PowerSyncDatabase` with `connect(connector, { diagnostics: true })`.
