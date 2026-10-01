---
'@powersync/nuxt': major
---

**Breaking:** `NuxtPowerSyncDatabase` is removed; use `PowerSyncDatabase` with `connect(connector, { diagnostics: true })`. Diagnostics now come from `@powersync/diagnostics`: a PowerSync tab on Nuxt DevTools 3, the devframe dock with MCP tools on Nuxt DevTools 4.
