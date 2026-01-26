---
'@powersync/web': minor
---

Managed triggers now use storage-backed (non-TEMP) SQLite triggers and tables when OPFS is the VFS. Resources persist across tabs and connection cycles to detect cross‑tab changes, and are automatically cleaned up when no longer in use. These should not be treated as permanent triggers; their lifecycle is managed by PowerSync.
