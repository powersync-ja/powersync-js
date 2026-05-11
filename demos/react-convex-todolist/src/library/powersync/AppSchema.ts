import { column, Schema, Table } from '@powersync/web';

export const LISTS_TABLE = 'lists';
export const TODOS_TABLE = 'todos';

const todos = new Table(
  {
    /**
     * This always corresponds to the local-first uuid of a list
     */
    list_uuid: column.text,
    created_at: column.text,
    completed_at: column.text,
    description: column.text,
    completed: column.integer,
    completed_by: column.text
  },
  { indexes: { list: ['list_uuid'] } }
);

const lists = new Table({
  created_at: column.text,
  name: column.text,
  owner_id: column.text,
  archived: column.integer,
  /** Free-form list notes (synced; list-level metadata) */
  notes: column.text,
  priority: column.integer,
  /** JSON-encoded string array, e.g. `["a","b"]` */
  tags: column.text
});

export const AppSchema = new Schema({
  todos,
  lists
});

export type Database = (typeof AppSchema)['types'];
export type TodoRecord = Database['todos'];
// OR:
// export type Todo = RowType<typeof todos>;

export type ListRecord = Database['lists'];

export type TodoListWithCountsRow = ListRecord & {
  total_tasks: number;
  completed_tasks: number;
};
