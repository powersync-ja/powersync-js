---
"@powersync/common": minor
---

[Fix] Preserve `Error.cause` when serializing sync status errors, so the full cause chain on `uploadError` and `downloadError` reaches `statusChanged` listeners.
