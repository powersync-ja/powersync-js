import { AbstractPowerSyncDatabase, column, Schema, Table } from '@powersync/web';
import { setSyncEnabled } from './SyncMode';

/**
 * This schema design supports a local-only to sync-enabled workflow by managing data
 * across two versions of each table: one for local-only use without syncing before a user registers,
 * the other for sync-enabled use after the user registers/signs in.
 *
 * This is done by utilizing the viewName property to override the default view name
 * of a table.
 *
 * See the README for details.
 *
 * `switchToSyncedSchema()` copies data from the local-only tables to the sync-enabled tables
 * so that it ends up in the upload queue.
 *
 */

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
  setSyncEnabled(db.database.name, true);

  await db.writeTransaction(async (tx) => {
    // Copy local-only data to the sync-enabled views.
    // This records each operation in the upload queue.
    // Overwrites the local-only owner_id value with the logged-in user's id.
    await tx.execute(
      'INSERT INTO lists(id, name, created_at, owner_id) SELECT id, name, created_at, ? FROM inactive_local_lists',
      [userId]
    );

    // Overwrites the local-only created_by value with the logged-in user's id.
    await tx.execute(
      'INSERT INTO todos(id, list_id, created_at, completed_at, description, completed, created_by) SELECT id, list_id, created_at, completed_at, description, completed, ? FROM inactive_local_todos',
      [userId]
    );

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
