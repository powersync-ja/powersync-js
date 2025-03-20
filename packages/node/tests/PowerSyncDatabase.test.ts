import { Worker } from 'node:worker_threads';
import fs from 'node:fs/promises';

import { vi, expect, test, onTestFinished } from 'vitest';
import { AppSchema, createTempDir, databaseTest } from './utils';
import { PowerSyncDatabase } from '../lib';
import { WorkerOpener } from '../lib/db/options';

test('validates options', async () => {
  await expect(async () => {
    const database = new PowerSyncDatabase({
      schema: AppSchema,
      database: {
        dbFilename: '/dev/null',
        readWorkerCount: 0,
      }
    });
    await database.init();
  }).rejects.toThrowError('Needs at least one worker for reads');
});

test('can customize loading workers', async () => {
  const directory = await createTempDir();
  const defaultWorker: WorkerOpener = (...args) => new Worker(...args);

  const openFunction = vi.fn(defaultWorker); // Wrap in vi.fn to count invocations

  const database = new PowerSyncDatabase({
    schema: AppSchema,
    database: {
      dbFilename: 'test.db',
      dbLocation: directory,
      openWorker: openFunction,
      readWorkerCount: 2
    }
  });

  await database.get('SELECT 1;'); // Make sure the database is ready and works
  expect(openFunction).toHaveBeenCalledTimes(3); // One writer, two readers
  await database.close();

  onTestFinished(async () => fs.rm(directory, { recursive: true }));
});

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
