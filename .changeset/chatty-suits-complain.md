---
'@powersync/web': minor
---

This adds the `preparedStatementsCache` option when opening databases. When set to a value greater than zero, that amount of SQL statements are cached by workers to avoid having to parse them every time a statement is executed.
