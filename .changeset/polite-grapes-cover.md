---
'@journeyapps/powersync-attachments': patch
---

Change `AbstractAttachmentQueue` implementation to not save the full URI in the `attachments` table, instead create the full URI when needed.
