---
'@powersync/nuxt': minor
---

Unify diagnostics with the other PowerSync hosts through `@powersync/diagnostics`: a PowerSync tab on Nuxt DevTools 3, the devframe dock with MCP tools on Nuxt DevTools 4. `NuxtPowerSyncDatabase` is removed; use `PowerSyncDatabase` with `connect(connector, { diagnostics: true })`.
