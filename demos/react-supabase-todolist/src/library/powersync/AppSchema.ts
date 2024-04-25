import { column, Schema, TableV2 } from '@powersync/web';

export const LISTS_TABLE = 'lists';
export const TODOS_TABLE = 'todos';

const todos = new TableV2(
  {
    list_id: column.text,
    created_at: column.text,
    completed_at: column.text,
    description: column.text,
    created_by: column.text,
    completed_by: column.text,
    completed: column.integer
  },
  { indexes: { list: ['list_id'] } }
);

const lists = new TableV2({
  created_at: column.text,
  name: column.text,
  owner_id: column.text
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
