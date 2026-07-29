---
'@powersync/shared-internals': patch
---

Fixed an issue where a local write made while the client was requesting a write checkpoint could leave the upload queue stuck, blocking uploads and downloads until the next local write.
