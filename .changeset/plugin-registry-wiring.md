---
'@powersync/shared-internals': minor
---

PowerSync databases accept watched-query plugins (`plugins` option): per-query hooks with core-owned seeding guards, provenance on watched query state, per-query `extensions` options and a `cleared` lifecycle event fired by `disconnectAndClear()`.
