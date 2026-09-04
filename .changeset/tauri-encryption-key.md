---
'@powersync/tauri-plugin': minor
---

Add an optional `encryptionKey` to `TauriSQLOpenOptions`. When set, the native
plugin keys every pooled SQLite connection via `PRAGMA key` before any other
statement runs, encrypting the on-disk database with SQLCipher. This is a
desktop-only, additive feature — omitting `encryptionKey` is byte-for-byte
identical to today's behavior.

The Rust crate gains a new opt-in Cargo feature, `encryption`, which selects
`rusqlite`'s `bundled-sqlcipher` build. It is off by default, so existing
consumers of `tauri-plugin-powersync` see no change in build output, binary
size, or platform requirements unless they explicitly enable it (e.g.
`tauri-plugin-powersync = { version = "...", features = ["encryption"] }`).
