---
'@powersync/common': minor
'@powersync/web': minor
---

Add support for storage-backed (non-TEMP) SQLite triggers and tables for managed triggers. These resources persist on disk while in use and are automatically cleaned up when no longer claimed or needed. They should not be considered permanent triggers; PowerSync manages their lifecycle.
