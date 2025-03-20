import { sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { eq, relations } from 'drizzle-orm';

import { databaseTest } from './utils';
import { wrapPowerSyncWithDrizzle } from '@powersync/drizzle-driver';
import { PowerSyncDatabase } from '../lib';
import { expect } from 'vitest';

export const drizzleLists = sqliteTable('lists', {
  id: text('id'),
  name: text('name')
});

export const drizzleTodos = sqliteTable('todos', {
  id: text('id'),
  content: text('content'),
  list_id: text('list_id')
});

export const listsRelations = relations(drizzleLists, ({ one, many }) => ({
  todos: many(drizzleTodos)
}));

export const todosRelations = relations(drizzleTodos, ({ one, many }) => ({
  list: one(drizzleLists, {
    fields: [drizzleTodos.list_id],
    references: [drizzleLists.id]
  })
}));

export const drizzleSchema = {
  lists: drizzleLists,
  todos: drizzleTodos,
  listsRelations,
  todosRelations
};

const setupDrizzle = async (database: PowerSyncDatabase) => {
  const db = wrapPowerSyncWithDrizzle(database, {
    schema: drizzleSchema
  });

  await db.insert(drizzleLists).values({ id: '1', name: 'list 1' });
  await db.insert(drizzleTodos).values({ id: '33', content: 'Post content', list_id: '1' });
  return db;
};

databaseTest('should retrieve a list with todos', async ({ database }) => {
  const db = await setupDrizzle(database);

  const result = await db.query.lists.findMany({ with: { todos: true } });

  expect(result).toEqual([{ id: '1', name: 'list 1', todos: [{ id: '33', content: 'Post content', list_id: '1' }] }]);
});

databaseTest('should retrieve a todo with its list', async ({ database }) => {
  const db = await setupDrizzle(database);

  const result = await db.query.todos.findMany({ with: { list: true } });

  expect(result).toEqual([
    {
      id: '33',
      content: 'Post content',
      list_id: '1',
      list: { id: '1', name: 'list 1' }
    }
  ]);
});

databaseTest('should return a list and todos using leftJoin', async ({ database }) => {
  const db = await setupDrizzle(database);

  const result = await db.select().from(drizzleLists).leftJoin(drizzleTodos, eq(drizzleLists.id, drizzleTodos.list_id));

  expect(result[0].lists).toEqual({ id: '1', name: 'list 1' });
  expect(result[0].todos).toEqual({ id: '33', content: 'Post content', list_id: '1' });
});

databaseTest('should return a list and todos using rightJoin', async ({ database }) => {
  const db = await setupDrizzle(database);

  const result = await db
    .select()
    .from(drizzleLists)
    .rightJoin(drizzleTodos, eq(drizzleLists.id, drizzleTodos.list_id));

  expect(result[0].lists).toEqual({ id: '1', name: 'list 1' });
  expect(result[0].todos).toEqual({ id: '33', content: 'Post content', list_id: '1' });
});

databaseTest('should return a list and todos using fullJoin', async ({ database }) => {
  const db = await setupDrizzle(database);

  const result = await db.select().from(drizzleLists).fullJoin(drizzleTodos, eq(drizzleLists.id, drizzleTodos.list_id));

  expect(result[0].lists).toEqual({ id: '1', name: 'list 1' });
  expect(result[0].todos).toEqual({ id: '33', content: 'Post content', list_id: '1' });
});
