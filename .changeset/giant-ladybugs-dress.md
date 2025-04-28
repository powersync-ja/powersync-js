---
'@powersync/common': minor
---

- Add `includeOld` option on `Table` which sets `CrudEntry.oldData` to previous values on updates.
- Add `includeMetadata` option on `Table` which adds a `_metadata` column that can be used for updates.
  The configured metadata is available through `CrudEntry.metadata`.
- Add `ignoreEmptyUpdate` option which skips creating CRUD entries for updates that don't change any values.
