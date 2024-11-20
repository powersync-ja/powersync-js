# PowerSync Drizzle Driver

This package (`@powersync/drizzle-driver`) brings the benefits of an ORM through our maintained [Drizzle](https://orm.drizzle.team/) driver to PowerSync.

## Alpha Release

The `drizzle-driver` package is currently in an Alpha release.

## Getting Started

Set up the PowerSync Database and wrap it with Drizzle.

```js
import { wrapPowerSyncWithDrizzle } from '@powersync/drizzle-driver';
import { PowerSyncDatabase } from '@powersync/web';
import { relations } from 'drizzle-orm';
import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { appSchema } from './schema';

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

## Schema Conversion

The `toPowerSyncSchema` schema function simplifies the process of integrating Drizzle with PowerSync. Define your Drizzle tables and supply the schema to the `toPowerSyncSchema` function for a unified development experience.

As the PowerSync table only supports `text`, `integer`, and `real`, the same limitation extends to the Drizzle table definitions.

```js
import { toPowerSyncSchema } from '@powersync/drizzle-driver';
import { sqliteTable, text } from 'drizzle-orm/sqlite-core';

// Define a Drizzle table
const lists = sqliteTable('lists', {
  id: text('id').primaryKey().notNull(),
  created_at: text('created_at'),
  name: text('name').notNull(),
  owner_id: text('owner_id')
});

export const drizzleSchema = {
  lists
};

export const AppSchema = toPowerSyncSchema(drizzleSchema);
```

### Defining PowerSync Options

The PowerSync table definition allows additional options supported by PowerSync's app schema beyond that which are supported by Drizzle.
They can be specified as follows. Note that these options exclude indexes as they can be specified in a Drizzle table.

```js
import { toPowerSyncSchema } from '@powersync/drizzle-driver';
// import { toPowerSyncSchema, type DrizzleTableWithPowerSyncOptions} from '@powersync/drizzle-driver'; for TypeScript

const listsWithOptions = { tableDefinition: logs, options: { localOnly: true } };
// const listsWithOptions: DrizzleTableWithPowerSyncOptions = { tableDefinition: logs, options: { localOnly: true } }; for TypeScript

export const drizzleSchemaWithOptions = {
  lists: listsWithOptions
};

export const AppSchema = toPowerSyncSchema(drizzleSchemaWithOptions);
```

### Converting a Single Table From Drizzle to Powersync

Drizzle tables can also be converted on a table-by-table basis with `toPowerSyncTable`.

```js
import { toPowerSyncTable } from '@powersync/drizzle-driver';
import { Schema } from '@powersync/web';
import { sqliteTable, text } from 'drizzle-orm/sqlite-core';

// Define a Drizzle table
const lists = sqliteTable('lists', {
  id: text('id').primaryKey().notNull(),
  created_at: text('created_at'),
  name: text('name').notNull(),
  owner_id: text('owner_id')
});

const psLists = toPowerSyncTable(lists); // converts the Drizzle table to a PowerSync table
// toPowerSyncTable(lists, { localOnly: true }); - allows for PowerSync table configuration

export const AppSchema = new Schema({
  lists: psLists // names the table `lists` in the PowerSync schema
});
```

## Known limitations

- The integration does not currently support nested transactions (also known as `savepoints`).

### Compilable queries

To use Drizzle queries in your hooks and composables, queries need to be converted using `toCompilableQuery`.

```js
import { toCompilableQuery } from '@powersync/drizzle-driver';

const query = db.select().from(lists);
const { data: listRecords, isLoading } = useQuery(toCompilableQuery(query));
```

For more information on how to use Drizzle queries in PowerSync, see [here](https://docs.powersync.com/client-sdk-references/javascript-web/javascript-orm/drizzle#usage-examples).
