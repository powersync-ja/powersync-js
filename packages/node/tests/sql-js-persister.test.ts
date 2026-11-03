// Regression test for https://github.com/powersync-ja/powersync-js/issues/1120: The sql.js adapter should work with the
// Rust sync client.

import { SQLJSOpenFactory, SQLJSPersister } from '@powersync/adapter-sql-js/src/SQLJSAdapter.js';
import { column, Schema, SyncStreamConnectionMethod, Table } from '@powersync/common';
import { expect, onTestFinished, vi } from 'vitest';

import { NodePowerSyncDatabaseOptions, PowerSyncDatabase } from '../lib/index.js';
import { mockSyncServiceTest, TestConnector } from './utils.js';

const options = { connectionMethod: SyncStreamConnectionMethod.HTTP, retryDelayMs: 100 };

mockSyncServiceTest('does not persist while a sync connection is active', async ({ syncService }) => {
  let stored: Uint8Array | null = null;
  let writeCount = 0;

  const persister: SQLJSPersister = {
    readFile: async () => stored,
    writeFile: async (data) => {
      stored = data as Uint8Array;
      writeCount++;
    }
  };

  const database = new PowerSyncDatabase({
    schema: new Schema({
      lists: new Table(
        {
          name: column.text
        },
        { localOnly: true }
      )
    }),
    factory: new SQLJSOpenFactory({ dbFilename: 'sql-js-persister-test.db', persister }),
    remoteOptions: syncService.remoteOptions
  } satisfies NodePowerSyncDatabaseOptions);

  onTestFinished(() => database.close());
  await database.init();

  // A write before connecting should be persisted as usual.
  await database.execute("INSERT INTO lists (id, name) VALUES (uuid(), 'before connect')");
  await vi.waitFor(() => expect(writeCount).toBeGreaterThan(0));

  database.connect(new TestConnector(), options);
  await vi.waitFor(() => expect(syncService.connectedListeners).toHaveLength(1));
  const writesBeforeConnecting = writeCount;

  syncService.pushLine({
    checkpoint: {
      last_op_id: '0',
      buckets: []
    }
  });
  syncService.pushLine({ checkpoint_complete: { last_op_id: '0' } });
  await database.waitForFirstSync();

  await database.execute("INSERT INTO lists (id, name) VALUES (uuid(), 'while connected')");

  await new Promise((resolve) => setTimeout(resolve, 50));
  expect(writeCount).toBe(writesBeforeConnecting);

  // disconnect() issues the `stop` control command, which should resume normal persistence.
  await database.disconnect();

  await database.execute("INSERT INTO lists (id, name) VALUES (uuid(), 'after disconnecting')");
  await vi.waitFor(() => expect(writeCount).toBeGreaterThan(writesBeforeConnecting + 1));
});
