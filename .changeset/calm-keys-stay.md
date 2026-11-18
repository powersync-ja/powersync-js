---
'@powersync/shared-internals': patch
---

Fix connecting after a soft `disconnectAndClear()` setting every `ps_oplog` key to `NULL`, and connecting after a second one failing with `powersync_remove_duplicate_key_encoding: invalid argument: Expected a text argument`.
