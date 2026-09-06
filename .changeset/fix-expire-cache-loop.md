---
'@powersync/common': patch
---

Fix `AttachmentQueue.expireCache()` never returning when there is nothing to delete. `AttachmentContext.deleteArchivedAttachments` reported that it was not finished for an empty page, so the pagination loop in `expireCache` kept re-running the same query indefinitely.
