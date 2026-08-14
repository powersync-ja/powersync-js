---
'@powersync/shared-internals': patch
'@powersync/react': patch
---

Log errors from watched queries with the PowerSync database's logger. Failures such as invalid SQL or a missing table previously only surfaced on the query state, so `useQuery` appeared to silently do nothing.
