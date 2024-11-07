# PowerSync Drizzle Driver

This package (`@powersync/drizzle-driver`) brings the benefits of an ORM through our maintained [Drizzle](https://orm.drizzle.team/) driver to PowerSync.

## Alpha Release

The `drizzle-driver` package is currently in an Alpha release.

## Getting Started

Set up the PowerSync Database and wrap it with Drizzle.

```js
import { wrapPowerSyncWithDrizzle } from '@powersync/drizzle-driver';
import { PowerSyncDatabase } from '@powersync/web';
import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { appSchema } from './schema';

import { wrapPowerSyncWithDrizzle } from '@powersync/drizzle-driver';

export const lists = sqliteTable('lists', {
  id: text('id'),
  name: text('name')
});

export const todos = sqliteTable('todos', {
  id: text('id'),
  description: text('description'),
  list_id: text('list_id'),
  created_at: text('created_at')
});

export const listsRelations = relations(lists, ({ one, many }) => ({
  todos: many(todos)
}));

export const todosRelations = relations(todos, ({ one, many }) => ({
  list: one(lists, {
    fields: [todos.list_id],
    references: [lists.id]
  })
}));

export const drizzleSchema = {
  lists,
  todos,
  listsRelations,
  todosRelations
};

export const powerSyncDb = new PowerSyncDatabase({
  database: {
    dbFilename: 'test.sqlite'
  },
  schema: appSchema
});

export const db = wrapPowerSyncWithDrizzle(powerSyncDb, {
  schema: drizzleSchema
});
```

## Known limitations

- The integration does not currently support nested transations (also known as `savepoints`).
- The Drizzle schema needs to be created manually, and it should match the table definitions of your PowerSync schema.

### Compilable queries

To use Drizzle queries in your hooks and composables, queries need to be converted using `toCompilableQuery`.

```js
import { toCompilableQuery } from '@powersync/drizzle-driver';

const query = db.select().from(lists);
const { data: listRecords, isLoading } = useQuery(toCompilableQuery(query));
```

For more information on how to use Drizzle queries in PowerSync, see [here](https://docs.powersync.com/client-sdk-references/javascript-web/javascript-orm/drizzle#usage-examples).
