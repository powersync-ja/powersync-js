---
'@powersync/common': patch
---

Fixed a deadlock in `deleteAttachment` by reusing the existing `AttachmentContext` instead of opening a nested `withContext` call.
