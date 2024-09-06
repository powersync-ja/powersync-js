# PowerSync Kysely Driver

This package (`packages/kysely-driver`) brings the benefits of an ORM through our maintained [Kysely](https://kysely.dev/) driver to [PowerSync](https://powersync.com).

## Beta Release

The `kysely-driver` package is currently in a beta release.

## Getting started

Set up the PowerSync Database and wrap it with Kysely.

Table column object type definitions are not yet available in JavaScript.

```js
import { wrapPowerSyncWithKysely } from '@powersync/kysely-driver';
import { PowerSyncDatabase } from '@powersync/web';
import { appSchema } from './schema';

export const powerSyncDb = new PowerSyncDatabase({
  database: {
    dbFilename: 'test.sqlite'
  },
  schema: appSchema
});

export const db = wrapPowerSyncWithKysely(powerSyncDb);
```

When defining the app schema with new `TableV2` declarations, the TypeScript types for tables can be automatically generated.
See an [example](https://github.com/powersync-ja/powersync-js/blob/main/demos/react-supabase-todolist/src/library/powersync/AppSchema.ts) of defining the app schema with `TableV2`.

```TypeScript
import { wrapPowerSyncWithKysely } from '@powersync/kysely-driver';
import { PowerSyncDatabase } from "@powersync/web";

// Define schema as in: https://docs.powersync.com/usage/installation/client-side-setup/define-your-schema
import { appSchema } from "./schema";

// If using Schema with TableV2
export type Database = (typeof appSchema)['types'];

// If using Schema with v1 tables
export type Database = {
  todos: TodoRecord; // Interface defined externally for Todo item object
  lists: ListsRecord; // Interface defined externally for list item object
};

export const powerSyncDb = new PowerSyncDatabase({
  database: {
    dbFilename: "test.sqlite"
  },
  schema: appSchema,
});

// `db` now automatically contains types for defined tables
export const db = wrapPowerSyncWithKysely<Database>(powerSyncDb)
```

For more information on Kysely typing, see [here](https://kysely.dev/docs/getting-started#types).

Now you are able to use Kysely queries:

### Select

- In Kysely

```js
const result = await db.selectFrom('users').selectAll().execute();

// {id: '1', name: 'user1', id: '2', name: 'user2'}
```

- In PowerSync

```js
const result = await powerSyncDb.getAll('SELECT * from users');

// {id: '1', name: 'user1', id: '2', name: 'user2'}
```

### Insert

- In Kysely

```js
await db.insertInto('users').values({ id: '1', name: 'John' }).execute();
const result = await db.selectFrom('users').selectAll().execute();

// {id: '1', name: 'John'}
```

- In PowerSync

```js
await powerSyncDb.execute('INSERT INTO users (id, name) VALUES(1, ?)', ['John']);
const result = await powerSyncDb.getAll('SELECT * from users');

// {id: '1', name: 'John'}
```

### Delete

- In Kysely

```js
await db.insertInto('users').values({ id: '2', name: 'Ben' }).execute();
await db.deleteFrom('users').where('name', '=', 'Ben').execute();
const result = await db.selectFrom('users').selectAll().execute();

// { }
```

- In PowerSync

```js
await powerSyncDb.execute('INSERT INTO users (id, name) VALUES(2, ?)', ['Ben']);
await powerSyncDb.execute(`DELETE FROM users WHERE name = ?`, ['Ben']);
const result = await powerSyncDb.getAll('SELECT * from users');

// { }
```

### Update

- In Kysely

```js
await db.insertInto('users').values({ id: '3', name: 'Lucy' }).execute();
await db.updateTable('users').where('name', '=', 'Lucy').set('name', 'Lucy Smith').execute();
const result = await db.selectFrom('users').select('name').executeTakeFirstOrThrow();

// { id: '3', name: 'Lucy Smith' }
```

- In PowerSync

```js
await powerSyncDb.execute('INSERT INTO users (id, name) VALUES(3, ?)', ['Lucy']);
await powerSyncDb.execute('UPDATE users SET name = ? WHERE name = ?', ['Lucy Smith', 'Lucy']);
const result = await powerSyncDb.getAll('SELECT * from users');

// { id: '3', name: 'Lucy Smith' }
```

### Transaction

- In Kysely

```js
await db.transaction().execute(async (transaction) => {
  await transaction.insertInto('users').values({ id: '4', name: 'James' }).execute();
  await transaction.updateTable('users').where('name', '=', 'James').set('name', 'James Smith').execute();
});
const result = await db.selectFrom('users').select('name').executeTakeFirstOrThrow();

// { id: '4', name: 'James Smith' }
```

- In PowerSync

```js
  await powerSyncDb.writeTransaction((transaction) => {
    await transaction.execute('INSERT INTO users (id, name) VALUES(4, ?)', ['James']);
    await transaction.execute("UPDATE users SET name = ? WHERE name = ?", ['James Smith', 'James']);
  })
  const result = await powerSyncDb.getAll('SELECT * from users')

  // { id: '4', name: 'James Smith' }
```
