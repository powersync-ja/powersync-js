---
'@powersync/op-sqlite': major
---

Initial stable version release.

Updated op-sqlite upstream dependency from 11.x.x to 14.0.2, the @powersync/op-sqlite package will now reflect the supported major version in its version (for example 0.14.x indicates support for version of 14.x.x of op-sqlite).

Noteworthy changes for 11 > 14 bump include:

1. SQLite updated to 3.49.1
2. Major/breaking update to SQLCipher 4.8. Be careful when upgrading to this version, your sqlcipher database will need to be updated as well (upgrading instructions [here](https://discuss.zetetic.net/t/upgrading-to-sqlcipher-4/3283)), read more on the [sqlcipher repo](https://github.com/sqlcipher/sqlcipher). Be sure to test your changes before upgrading.
3. Monorepo config resolution, you may need to move your `op-sqlite` config from your application's `package.json` to the monorepo root `package.json` depending on where your package manager tool hoists modules (see [1](https://op-engineering.github.io/op-sqlite/docs/installation) and [2](https://github.com/OP-Engineering/op-sqlite/issues/264)).
