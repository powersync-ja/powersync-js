---
'@powersync/common': patch
'@powersync/shared-internals': patch
'@powersync/capacitor': patch
'@powersync/diagnostics': patch
'@powersync/tauri-plugin': patch
---

Doc comments, log messages, error messages and README examples now describe authenticators and mutation uploaders alongside backend connectors. Also fixes Tauri README example: now connects with an authenticator and an uploader, since the backend connector is no longer supported.
