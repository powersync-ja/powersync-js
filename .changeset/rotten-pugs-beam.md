---
'@powersync/op-sqlite': minor
---

Updated op-sqlite upstream peer dependency from 11.x.x to support ^13.x.x and ^14.x.x,

Noteworthy changes from version 11 to version 14 include:

1. SQLite updated to 3.49.1
2. SQLCipher updated to 4.8.0
3. Monorepo config resolution, you may need to move your `op-sqlite` config from your application's `package.json` to the monorepo root `package.json` depending on where your package manager tool hoists modules (see [1](https://op-engineering.github.io/op-sqlite/docs/installation) and [2](https://github.com/OP-Engineering/op-sqlite/issues/264)).
