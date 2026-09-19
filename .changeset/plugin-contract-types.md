---
'@powersync/common': minor
---

Added the watched-query plugin contract (`WatchedQueryPlugin`), `source`/`sourceMeta` provenance on `WatchedQueryState`, per-query `extensions` options, a `plugins` database option, and a `cleared` lifecycle event. Implementors of `WatchedQueryState` outside the SDK must add the two new fields.
