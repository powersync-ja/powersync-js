---
'@powersync/common': minor
'@powersync/node': minor
'@powersync/web': minor
'@powersync/react-native': minor
---

Add experimental support for raw tables, giving you full control over the table structure to sync into.
While PowerSync manages tables as JSON views by default, raw tables have to be created by the application
developer. Also, the upsert and delete statements for raw tables needs to be specified in the app schema:

```JavaScript
const customSchema = new Schema({});
customSchema.withRawTables({
  lists: {
    put: {
      sql: 'INSERT OR REPLACE INTO lists (id, name) VALUES (?, ?)',
      // put statements can use `Id` and extracted columns to bind parameters.
      params: ['Id', { Column: 'name' }]
    },
    delete: {
      sql: 'DELETE FROM lists WHERE id = ?',
      // delete statements can only use the id (but a CTE querying existing rows by id could
      // be used as a workaround).
      params: ['Id']
    }
  }
});

const powersync = // open powersync database;
await powersync.execute('CREATE TABLE lists (id TEXT NOT NULL PRIMARY KEY, name TEXT);');

// Ready to sync into your custom table at this point
```

The main benefit of raw tables is better query performance (since SQLite doesn't have to
extract rows from JSON) and more control (allowing the use of e.g. column and table constraints).
