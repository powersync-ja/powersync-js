<p align="center">
  <a href="https://www.powersync.com" target="_blank"><img src="https://github.com/powersync-ja/.github/assets/19345049/602bafa0-41ce-4cee-a432-56848c278722"/></a>
</p>

# PowerSync Kysely Driver

[PowerSync](https://powersync.com) is a service and set of SDKs that keeps Postgres databases in sync with on-device SQLite databases.

This package (`packages/kysely-driver`) is the PowerSync maintained driver for using the [Kysley](https://kysely.dev/) query builder with PowerSync.

## Getting started

Setup the PowerSync Database and wrap it with Kysley.

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

Now you are able to use Kysley queries:

### Select

```js
  const result = await db.selectFrom('users').selectAll().execute();

  // {id: '1', name: 'user1', id: '2', name: 'user2'}
```

### Insert

```js
  await db.insertInto('users').values({ id: '1', name: 'John' }).execute();
  const result = await db.selectFrom('users').selectAll().execute();

  // {id: '1', name: 'John'}
```

### Delete

```js
  await db.insertInto('users').values({ id: '2', name: 'Ben' }).execute();
  await db.deleteFrom('users').where('name', '=', 'Ben').execute();
  const result = await db.selectFrom('users').selectAll().execute();

  // { }
```

### Update

```js
  await db.insertInto('users').values({ id: '3', name: 'Lucy' }).execute();
  await db.updateTable('users').where('name', '=', 'Lucy').set('name', 'Lucy Smith').execute();
  const result = await db.selectFrom('users').select('name').executeTakeFirstOrThrow();

  // { id: '3', name: 'Lucy Smith' }
```

### Transaction

```js
  await db.transaction().execute(async (transaction) => {
    await transaction.insertInto('users').values({ id: '4', name: 'James' }).execute();
    await transaction.updateTable('users').where('name', '=', 'James').set('name', 'James Smith').execute();
  });
  const result = await db.selectFrom('users').select('name').executeTakeFirstOrThrow();

    // { id: '4', name: 'James Smith' }
```
