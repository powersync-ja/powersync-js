import { vi, expect, test } from 'vitest';
import { databaseTest } from './utils';

databaseTest('links powersync', async ({ database }) => {
  await database.get('select powersync_rs_version();');
});

databaseTest('runs queries on multiple threads', async ({ database }) => {
  const threads = new Set<number>();

  const collectWorkerThreadId = async () => {
    const row = await database.get<{ r: number }>('SELECT node_thread_id() AS r');
    threads.add(row.r);
    return row.r;
  };

  const queryTasks: Promise<number>[] = [];
  for (let i = 0; i < 10; i++) {
    queryTasks.push(collectWorkerThreadId());
  }

  const res = await Promise.all(queryTasks);
  expect(res).toHaveLength(10);
  expect([...threads]).toHaveLength(5);
});

databaseTest('can watch tables', async ({ database }) => {
  const fn = vi.fn();
  const disposeWatch = database.onChangeWithCallback(
    {
      onChange: () => {
        fn();
      }
    },
    { tables: ['todos'], throttleMs: 0 }
  );

  await database.execute('INSERT INTO todos (id, content) VALUES (uuid(), ?)', ['first']);
  await expect.poll(() => fn).toHaveBeenCalledOnce();

  await database.writeTransaction(async (tx) => {
    await tx.execute('INSERT INTO todos (id, content) VALUES (uuid(), ?)', ['second']);
  });
  await expect.poll(() => fn).toHaveBeenCalledTimes(2);

  await database.writeTransaction(async (tx) => {
    await tx.execute('DELETE FROM todos;');
    await tx.rollback();
  });
  await expect.poll(() => fn).toHaveBeenCalledTimes(2);

  disposeWatch();
  await database.execute('INSERT INTO todos (id, content) VALUES (uuid(), ?)', ['fourth']);
  await expect.poll(() => fn).toHaveBeenCalledTimes(2);
});

databaseTest.skip('can watch queries', async ({ database }) => {
  const query = await database.watch('SELECT * FROM todos;', [])[Symbol.asyncIterator]();
  expect((await query.next()).value.rows).toHaveLength(0);

  await database.execute('INSERT INTO todos (id, content) VALUES (uuid(), ?)', ['first']);
  // TODO: There is a race condition somewhere, this reports now rows sometimes.
  expect((await query.next()).value.rows).toHaveLength(1);

  await database.writeTransaction(async (tx) => {
    await tx.execute('INSERT INTO todos (id, content) VALUES (uuid(), ?)', ['second']);
    await tx.execute('INSERT INTO todos (id, content) VALUES (uuid(), ?)', ['third']);
  });

  expect((await query.next()).value.rows).toHaveLength(3);

  await database.writeTransaction(async (tx) => {
    await tx.execute('DELETE FROM todos;');
    await tx.rollback();
  });

  await database.execute('INSERT INTO todos (id, content) VALUES (uuid(), ?)', ['fourth']);
  expect((await query.next()).value.rows).toHaveLength(4);
});
