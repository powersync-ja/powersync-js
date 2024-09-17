import { AbstractPowerSyncDatabase, column, ColumnsType, Schema, Table, TableV2Options } from '@powersync/web';
import { setSyncEnabled } from './SyncMode';

export const LISTS_TABLE = 'lists';
export const TODOS_TABLE = 'todos';

const todosDef = {
  name: 'todos',
  columns: {
    list_id: column.text,
    created_at: column.text,
    completed_at: column.text,
    description: column.text,
    created_by: column.text,
    completed_by: column.text,
    completed: column.integer
  },
  options: { indexes: { list: ['list_id'] } }
};

const listsDef = {
  name: 'lists',
  columns: {
    created_at: column.text,
    name: column.text,
    owner_id: column.text
  },
  options: {}
};

export function makeSchema(synced: boolean) {
  const syncedName = (table: string): string => {
    if (synced) {
      // results in lists, todos
      return table;
    } else {
      // in the local-only mode of the demo
      // these tables are not used
      return `inactive_synced_${table}`;
    }
  };

  const localName = (table: string): string => {
    if (synced) {
      // in the sync-enabled mode of the demo
      // these tables are not used
      return `inactive_local_${table}`;
    } else {
      // results in lists, todos
      return table;
    }
  };

  // Could iterate over table definitions to create the schema while somehow maintaining type information for record types
  return new Schema({
    todos: new Table(todosDef.columns, { ...todosDef.options, viewName: syncedName(todosDef.name) }),
    local_todos: new Table(todosDef.columns, {
      ...todosDef.options,
      localOnly: true,
      viewName: localName(todosDef.name)
    }),
    lists: new Table(listsDef.columns, { ...listsDef.options, viewName: syncedName(listsDef.name) }),
    local_lists: new Table(listsDef.columns, {
      ...listsDef.options,
      localOnly: true,
      viewName: localName(listsDef.name)
    })
  });
}

export async function switchToSyncedSchema(db: AbstractPowerSyncDatabase, userId: string) {
  await db.updateSchema(makeSchema(true));

  // needed to ensure that watches/queries are aware of the updated schema
  // await db.refreshSchema();
  setSyncEnabled(db.database.name, true);

  await db.writeTransaction(async (tx) => {
    // Copy local-only data to the sync-enabled views.
    // This records each operation in the upload queue.
    await tx.execute(
      'INSERT INTO lists(id, name, created_at, owner_id) SELECT id, name, created_at, ? FROM inactive_local_lists',
      [userId]
    );

    await tx.execute('INSERT INTO todos SELECT * FROM inactive_local_todos');

    // Delete the local-only data.
    await tx.execute('DELETE FROM inactive_local_todos');
    await tx.execute('DELETE FROM inactive_local_lists');
  });
}

export async function switchToLocalSchema(db: AbstractPowerSyncDatabase) {
  await db.updateSchema(makeSchema(false));
  setSyncEnabled(db.database.name, false);
}

// This is only used for typing purposes
export const AppSchema = makeSchema(false);

export type Database = (typeof AppSchema)['types'];
export type TodoRecord = Database['todos'];
// OR:
// export type Todo = RowType<typeof todos>;

export type ListRecord = Database['lists'];
