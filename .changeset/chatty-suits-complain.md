---
'@powersync/web': minor
---

This adds the `preparedStatementsCache` option when opening databases. While disabled by default, caching prepared statements can improve performance by not having to parse them every time a statement is executed.
