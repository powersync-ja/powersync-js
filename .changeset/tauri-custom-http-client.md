---
'tauri-plugin-powersync': minor
---

Add `init_with_options` with `PowerSyncOptions`, allowing apps to configure the `reqwest::Client` used for sync requests (e.g. for custom TLS settings, timeouts or proxies).
