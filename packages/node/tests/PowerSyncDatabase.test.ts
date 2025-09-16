import * as path from 'node:path';
import { Worker } from 'node:worker_threads';

import { vi, expect, test } from 'vitest';
import { AppSchema, databaseTest, tempDirectoryTest } from './utils';
import { CrudEntry, CrudTransaction, PowerSyncDatabase } from '../lib';
import { WorkerOpener } from '../lib/db/options';

test('validates options', async () => {
  await expect(async () => {
    const database = new PowerSyncDatabase({
      schema: AppSchema,
      database: {
        dbFilename: '/dev/null',
        readWorkerCount: 0
      }
    });
    await database.init();
  }).rejects.toThrowError('Needs at least one worker for reads');
});

tempDirectoryTest('can customize loading workers', async ({ tmpdir }) => {
  const defaultWorker: WorkerOpener = (...args) => new Worker(...args);

  const openFunction = vi.fn(defaultWorker); // Wrap in vi.fn to count invocations

  const database = new PowerSyncDatabase({
    schema: AppSchema,
    database: {
      dbFilename: 'test.db',
      dbLocation: tmpdir,
      openWorker: openFunction,
      readWorkerCount: 2
    }
  });

  await database.get('SELECT 1;'); // Make sure the database is ready and works
  expect(openFunction).toHaveBeenCalledTimes(3); // One writer, two readers
  await database.close();
});

databaseTest('links powersync', async ({ database }) => {
  await database.get('select powersync_rs_version();');
});

tempDirectoryTest('runs queries on multiple threads', async ({ tmpdir }) => {
  const database = new PowerSyncDatabase({
    schema: AppSchema,
    database: {
      dbFilename: 'test.db',
      dbLocation: tmpdir
    }
  });
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
  await database.close();
  expect(res).toHaveLength(10);
  expect([...threads]).toHaveLength(5);
});

databaseTest('runs queries on multiple threads', async ({ database }) => {});

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

tempDirectoryTest('throws error if target directory does not exist', async ({ tmpdir }) => {
  const directory = path.join(tmpdir, 'some', 'nested', 'location', 'that', 'does', 'not', 'exist');

  await expect(async () => {
    const database = new PowerSyncDatabase({
      schema: AppSchema,
      database: {
        dbFilename: 'test.db',
        dbLocation: directory,
        readWorkerCount: 2
      }
    });
    await database.waitForReady();
  }).rejects.toThrowError(/The dbLocation directory at ".+" does not exist/);
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

databaseTest('getCrudTransactions', async ({ database }) => {
  async function createTransaction(amount: number) {
    await database.writeTransaction(async (tx) => {
      for (let i = 0; i < amount; i++) {
        await tx.execute('insert into todos (id) values (uuid())');
      }
    });
  }

  let iterator = database.getCrudTransactions()[Symbol.asyncIterator]();
  expect(await iterator.next()).toMatchObject({ done: true });

  await createTransaction(5);
  await createTransaction(10);
  await createTransaction(15);

  let lastTransaction: CrudTransaction | null = null;
  let batch: CrudEntry[] = [];

  // Take the first two transactions via the async generator.
  for await (const transaction of database.getCrudTransactions()) {
    batch.push(...transaction.crud);
    lastTransaction = transaction;

    if (batch.length > 10) {
      break;
    }
  }

  expect(batch).toHaveLength(15);
  await lastTransaction!.complete();

  const remainingTransaction = await database.getNextCrudTransaction();
  expect(remainingTransaction?.crud).toHaveLength(15);
});
