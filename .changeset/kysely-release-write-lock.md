---
'@powersync/kysely-driver': patch
---

Release the PowerSync write lock when a Kysely transaction's COMMIT or ROLLBACK fails, instead of leaving every later write waiting forever.
