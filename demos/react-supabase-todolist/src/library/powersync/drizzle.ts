import { wrapPowerSyncWithDrizzle } from '@powersync/drizzle-driver';
import { PowerSyncDatabase } from '@powersync/web';
import { relations } from 'drizzle-orm';
import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { AppSchema } from './AppSchema';

export const lists = sqliteTable('lists', {
  id: text('id'),
  name: text('name')
    .$onUpdate(() => Date.now().toString())
    .notNull()
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
