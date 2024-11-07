# PowerSync Drizzle Driver

```
import { wrapPowerSyncWithDrizzle} from "@powersync/drizzle-driver";

export const lists = sqliteTable("lists", {
  id: text("id"),
  name: text("name"),
});

export const todos = sqliteTable("todos", {
  id: text("id"),
  description: text("description"),
  list_id: text("list_id"),
  created_at: text("created_at"),
});

export const listsRelations = relations(lists, ({ one, many }) => ({
  todos: many(todos),
}));

export const todosRelations = relations(todos, ({ one, many }) => ({
  list: one(lists, {
    fields: [todos.list_id],
    references: [lists.id],
  }),
}));

export const db = wrapPowerSyncWithDrizzle(PowerSync, {
  schema: {
    lists,
    todos,
    listsRelations,
    todosRelations,
  },
});

```

## Compilable queries

To use drizzle queries in our hooks and composables they currently need to be converted.

```
import { toCompilableQuery } from "@powersync/drizzle-driver";

const query = drizzleDb.select().from(lists);
const { data: listRecords, isLoading } = useQuery(toCompilableQuery(query));
```
