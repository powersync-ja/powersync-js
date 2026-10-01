---
'@powersync/shared-internals': patch
'@powersync/common': patch
---

Fix `onChangeWithCallback`, `watchWithCallback`, `compilableQueryWatch`, `AbstractQueryProcessor` and `AttachmentQueue.startSync` leaking listeners when aborted or stopped early (closes #1056, closes #1127).
