---
'@powersync/node': minor
---

Use upstream better-sqlite3 dependency instead of the PowerSync fork.

After upgrading:

1. Ensure you no longer depend on the `@powersync/better-sqlite3` package: `npm uninstall @powersync/better-sqlite3`.
2. Unlike in older versions, the upstream `better-sqlite3` dependency is marked as optional since custom forks
   are supported too.
   Use `npm install better-sqlite3` to install it.
