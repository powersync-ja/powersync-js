---
'@journeyapps/powersync-attachments': patch
---

Change `AbstractAttachmentQueue` implementation to not save the full URI in the `attachments` table, instead create it when needed.
