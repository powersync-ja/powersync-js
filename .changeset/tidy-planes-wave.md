---
'@powersync/shared-internals': patch
---

Fix `onChangeWithCallback` and `AbstractQueryProcessor` leaking listeners when aborted early (closes #1056).
