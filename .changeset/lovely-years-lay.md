---
'@powersync/common': patch
---

AttachmentQueue: release the mutex per attachment, persist incrementally, and let `stopSync` interrupt mid-batch so foreground `saveFile` / `deleteFile` aren't blocked behind in-flight uploads or downloads.
