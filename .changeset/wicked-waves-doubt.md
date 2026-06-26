---
'@powersync/react-native': major
---

Remove support for React Native Quick SQLite (RNQS). Additionally, `OPSqliteOpenFactory` is now the default and part
of the `@powersync/react-native` package.

To upgrade, drop dependencies on `@powersync/op-sqlite`. If you've previously used RNQS, also add a dependency on
`@op-engineering/op-sqlite`.

If you've previously used a `OPSqliteOpenFactory`, all options are now available on the `PowerSyncDatabase`
constructor directly:

```TypeScript
// Before
const db = new PowerSyncDatabase({
  database: new OPSqliteOpenFactory({dbFilename: 'test.db'})
});

// After
const db = new PowerSyncDatabase({
  database: { dbFilename: 'test.db' }
});
```
