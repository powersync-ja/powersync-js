<p align="center">
  <a href="https://www.powersync.com" target="_blank"><img src="https://github.com/powersync-ja/.github/assets/19345049/602bafa0-41ce-4cee-a432-56848c278722"/></a>
</p>

# PowerSync Kysely Driver

[PowerSync](https://powersync.com) is a service and set of SDKs that keeps Postgres databases in sync with on-device SQLite databases.

This package (`packages/kysely-driver`) brings the benefits of an ORM through our maintained [Kysely](https://kysely.dev/) driver to PowerSync.

## Getting started

Setup the PowerSync Database and wrap it with Kysely.

```js
import { wrapPowerSyncWithKysely } from '@powersync/kysely-driver';
import { WASQLitePowerSyncDatabaseOpenFactory } from "@journeyapps/powersync-sdk-web";
import { appSchema } from "./schema";
import { Database } from "./types";

const factory = new WASQLitePowerSyncDatabaseOpenFactory({
  schema: appSchema,
  dbFilename: "test.sqlite",
});

export const powerSyncDb = factory.getInstance();

export const db = wrapPowerSyncWithKysely<Database>(powerSyncDb)
```

For more information on Kysely typing [here](https://kysely.dev/docs/getting-started#types).

Now you are able to use Kysely queries:

### Select

* In Kysely

```js
  const result = await db.selectFrom('users').selectAll().execute();

  // {id: '1', name: 'user1', id: '2', name: 'user2'}
```

* In PowerSync

```js
  const result = await powerSyncDb.getAll('SELECT * from users')

  // {id: '1', name: 'user1', id: '2', name: 'user2'}
```

### Insert

* In Kysely

```js
  await db.insertInto('users').values({ id: '1', name: 'John' }).execute();
  const result = await db.selectFrom('users').selectAll().execute();

  // {id: '1', name: 'John'}
```

* In PowerSync

```js
  await powerSyncDb.execute('INSERT INTO users (id, name) VALUES(1, ?)', ['John']);
  const result = await powerSyncDb.getAll('SELECT * from users')

  // {id: '1', name: 'John'}
```

### Delete

* In Kysely

```js
  await db.insertInto('users').values({ id: '2', name: 'Ben' }).execute();
  await db.deleteFrom('users').where('name', '=', 'Ben').execute();
  const result = await db.selectFrom('users').selectAll().execute();

  // { }
```

* In PowerSync

```js
  await powerSyncDb.execute('INSERT INTO users (id, name) VALUES(2, ?)', ['Ben']);
  await powerSyncDb.execute(`DELETE FROM users WHERE name = ?`, ['Ben']);
  const result = await powerSyncDb.getAll('SELECT * from users')

  // { }
```

### Update

* In Kysely

```js
  await db.insertInto('users').values({ id: '3', name: 'Lucy' }).execute();
  await db.updateTable('users').where('name', '=', 'Lucy').set('name', 'Lucy Smith').execute();
  const result = await db.selectFrom('users').select('name').executeTakeFirstOrThrow();

  // { id: '3', name: 'Lucy Smith' }
```

* In PowerSync

```js
  await powerSyncDb.execute('INSERT INTO users (id, name) VALUES(3, ?)', ['Lucy']);
  await powerSyncDb.execute("UPDATE users SET name = ? WHERE name = 'Lucy'", ['Lucy Smith']);
  const result = await powerSyncDb.getAll('SELECT * from users')

  // { id: '3', name: 'Lucy Smith' }
```

### Transaction

* In Kysely

```js
  await db.transaction().execute(async (transaction) => {
    await transaction.insertInto('users').values({ id: '4', name: 'James' }).execute();
    await transaction.updateTable('users').where('name', '=', 'James').set('name', 'James Smith').execute();
  });
  const result = await db.selectFrom('users').select('name').executeTakeFirstOrThrow();

    // { id: '4', name: 'James Smith' }
```

* In PowerSync

```js
  await powerSyncDb.writeTransaction((transaction) => {
    await transaction.execute('INSERT INTO users (id, name) VALUES(4, ?)', ['James']);
    await transaction.execute("UPDATE users SET name = ? WHERE name = 'James'", ['James Smith']);
  })
  const result = await powerSyncDb.getAll('SELECT * from users')

  // { id: '4', name: 'James Smith' }
```
