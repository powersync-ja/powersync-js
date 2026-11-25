---
'@powersync/common': patch
'@powersync/shared-internals': patch
'@powersync/capacitor': patch
'@powersync/diagnostics': patch
'@powersync/tauri-plugin': patch
---

Doc comments, log messages, error messages and README examples now describe authenticators and mutation uploaders alongside backend connectors. Also fixes the Tauri README example: now connects with an authenticator and an uploader, since `tauri-plugin-powersync` 0.3.0 no longer supports backend connectors.
