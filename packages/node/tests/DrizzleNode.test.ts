import { sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { eq, relations } from 'drizzle-orm';

import { customDatabaseTest, databaseTest } from './utils';
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

databaseTest('insert returning', async ({ database }) => {
  const db = await setupDrizzle(database);

  // This is a special case since it's an insert query that returns values
  const result = await db.insert(drizzleLists).values({ id: '2', name: 'list 2' }).returning();

  expect(result).toEqual([{ id: '2', name: 'list 2' }]);
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

customDatabaseTest({ database: { readWorkerCount: 2 } as any })(
  'should execute transactions concurrently',
  {},
  async ({ database }) => {
    // This test opens one write transaction and two read transactions, testing that they can all execute
    // concurrently.
    const db = await setupDrizzle(database);

    const openedWrite = deferred();
    const openedRead1 = deferred();
    const openedRead2 = deferred();
    const completedWrite = deferred();

    const t1 = db.transaction(async (tx) => {
      await tx.insert(drizzleLists).values({ id: '2', name: 'list 2' });

      openedWrite.resolve();

      await openedRead1.promise;
      await openedRead2.promise;

      completedWrite.resolve();
    });

    await openedWrite.promise;

    const t2 = db.transaction(
      async (tx) => {
        const result = await tx.query.lists.findMany();
        expect(result).toEqual([{ id: '1', name: 'list 1' }]);
        openedRead1.resolve();
        await completedWrite.promise;
      },
      { accessMode: 'read only' }
    );

    const t3 = db.transaction(
      async (tx) => {
        await openedRead1.promise;
        const result = await tx.query.lists.findMany();
        expect(result).toEqual([{ id: '1', name: 'list 1' }]);

        openedRead2.resolve();
        await completedWrite.promise;
      },
      { accessMode: 'read only' }
    );

    await Promise.all([t1, t2, t3]);

    const result = await db.query.lists.findMany();
    expect(result).toEqual([
      { id: '1', name: 'list 1' },
      { id: '2', name: 'list 2' }
    ]);
  }
);

customDatabaseTest({ database: { readWorkerCount: 2 } as any })(
  'should execute select queries concurrently',
  async ({ database }) => {
    // This test opens one write transaction and two read transactions, testing that they can all execute
    // concurrently.
    const db = await setupDrizzle(database);

    const openedWrite = deferred();
    const completedRead = deferred();
    const completedWrite = deferred();

    const t1 = db.transaction(async (tx) => {
      await tx.insert(drizzleLists).values({ id: '2', name: 'list 2' });

      openedWrite.resolve();

      await completedRead.promise;

      completedWrite.resolve();
    });

    await openedWrite.promise;

    const result1 = await db.select().from(drizzleLists);
    expect(result1).toEqual([{ id: '1', name: 'list 1' }]);

    const result2 = await db
      .select()
      .from(drizzleLists)
      .fullJoin(drizzleTodos, eq(drizzleLists.id, drizzleTodos.list_id));

    expect(result2[0].lists).toEqual({ id: '1', name: 'list 1' });
    expect(result2[0].todos).toEqual({ id: '33', content: 'Post content', list_id: '1' });

    // Note: This case is not supported yet (drizzle 0.44.7), since it doesn't set
    // queryMetadata for these queries
    // const result3 = await db.query.lists.findMany();
    // expect(result3).toEqual([{ id: '1', name: 'list 1' }]);

    completedRead.resolve();

    await t1;

    const resultAfter = await db.query.lists.findMany();
    expect(resultAfter).toEqual([
      { id: '1', name: 'list 1' },
      { id: '2', name: 'list 2' }
    ]);
  }
);

function deferred<T = void>() {
  let resolve: (value: T) => void;
  let reject: (err) => void;
  const promise = new Promise<T>((a, b) => {
    resolve = a;
    reject = b;
  });
  return {
    promise,
    resolve,
    reject
  };
}
