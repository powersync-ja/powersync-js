import { column, Schema, Table } from '@powersync/web';
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const LISTS_TABLE = 'lists';
export const TODOS_TABLE = 'todos';

const todos = new Table(
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

const lists = new Table({
  created_at: column.text,
  name: column.text,
  owner_id: column.text
});

export const AppSchema = new Schema({
  todos,
  lists
});

export const drizzleTodos = sqliteTable('todos', {
  id: text('id').primaryKey().notNull(),
  created_at: text('created_at'),
  completed_at: text('completed_at'),
  description: text('name'),
  completed: integer('completed')
});

export const drizzleSchema = { drizzleTodos };

export type Database = (typeof AppSchema)['types'];
export type TodoRecord = Database['todos'];
// OR:
// export type Todo = RowType<typeof todos>;

export type ListRecord = Database['lists'];
