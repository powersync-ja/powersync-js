---
'@powersync/shared-internals': patch
---

Stop sending the HTTP sync stream request with `cache: 'no-store'`. With it, Chromium and Firefox skipped the CORS preflight cache, so every connect and reconnect sent an `OPTIONS` request first.
