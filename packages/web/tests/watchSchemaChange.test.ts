import { AbstractPowerSyncDatabase, QueryResult } from '@powersync/common';
import { PowerSyncDatabase } from '@powersync/web';
import { v4 as uuid } from 'uuid';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { makeOptionalSyncSchema } from './utils/optionalSyncTestSchema';
vi.useRealTimers();

/**
 * There seems to be an issue with Vitest browser mode's setTimeout and
 * fake timer functionality.
 * e.g. calling:
 *      await new Promise<void>((resolve) => setTimeout(resolve, 10));
 * waits for 1 second instead of 10ms.
 * Setting this to 1 second as a work around.
 */
const throttleDuration = 1000;

describe('Watch With Schema Change Tests', { sequential: true }, () => {
  let powersync: AbstractPowerSyncDatabase;

  beforeEach(async () => {
    powersync = new PowerSyncDatabase({
      database: { dbFilename: 'test-watch-optional-sync.db' },
      schema: makeOptionalSyncSchema(false),
      flags: {
        enableMultiTabs: false
      }
    });
    await powersync.init();
  });

  afterEach(async () => {
    await powersync.disconnectAndClear();
    await powersync.close();
  });

  it('should trigger onResult after schema change', async () => {
    const userId = uuid();
    const abortController = new AbortController();

    let lastResult = 0;
    const query = 'SELECT count() AS count FROM assets';

    const watch = powersync.watch(query, [], {
      signal: abortController.signal,
      throttleMs: throttleDuration
    });

    const assetsWatchTables = await getSourceTables(powersync, query);
    expect(assetsWatchTables.includes('ps_data_local__local_assets')).toBeTruthy();

    (async () => {
      for await (const results of watch) {
        lastResult = results.rows?._array[0].count; // `count` from sql output
      }
    })();

    // Insert 3 records
    for (let i = 0; i < 3; i++) {
      await powersync.execute('INSERT INTO assets(id, make, customer_id) VALUES (uuid(), ?, ?)', ['test', userId]);
    }
    await new Promise<void>((resolve) => setTimeout(resolve, throttleDuration * 2));

    expect(lastResult).toBe(3);

    // changes the underlying table that the `assets` and `customers` views are based on
    await powersync.updateSchema(makeOptionalSyncSchema(true));

    const onlineAssetsWatchTables = await getSourceTables(powersync, query);
    expect(onlineAssetsWatchTables.includes('ps_data__assets')).toBeTruthy();

    await powersync.writeTransaction(async (tx) => {
      // Copy local data to the "online" views.
      await tx.execute(
        'INSERT INTO assets(id, description, customer_id, user_id) SELECT id, description, customer_id, ? FROM inactive_local_assets',
        [userId]
      );

      // Delete the "local-only" data.
      await tx.execute('DELETE FROM inactive_local_customers');
      await tx.execute('DELETE FROM inactive_local_assets');
    });

    for (let i = 0; i < 3; i++) {
      await powersync.execute('INSERT INTO assets(id, make, customer_id) VALUES (uuid(), ?, ?)', ['test', uuid()]);
    }
    await new Promise<void>((resolve) => setTimeout(resolve, throttleDuration * 2));
    abortController.abort();

    expect(lastResult).toBe(6);
  });

  it('should trigger onResult after schema change (callback)', async () => {
    const userId = uuid();
    const abortController = new AbortController();

    let lastResult = 0;
    const query = 'SELECT count() AS count FROM assets';

    const onUpdate = (results: QueryResult) => {
      lastResult = results.rows?._array[0].count; // `count` from sql output
    };

    powersync.watch(
      query,
      [],
      { onResult: onUpdate },
      { signal: abortController.signal, throttleMs: throttleDuration }
    );

    const assetsWatchTables = await getSourceTables(powersync, query);
    expect(assetsWatchTables.includes('ps_data_local__local_assets')).toBeTruthy();

    // Insert 3 records
    for (let i = 0; i < 3; i++) {
      await powersync.execute('INSERT INTO assets(id, make, customer_id) VALUES (uuid(), ?, ?)', ['test', userId]);
    }
    await new Promise<void>((resolve) => setTimeout(resolve, throttleDuration * 2));

    expect(lastResult).toBe(3);

    // changes the underlying table that the `assets` and `customers` views are based on
    await powersync.updateSchema(makeOptionalSyncSchema(true));

    const onlineAssetsWatchTables = await getSourceTables(powersync, query);
    expect(onlineAssetsWatchTables.includes('ps_data__assets')).toBeTruthy();

    await powersync.writeTransaction(async (tx) => {
      // Copy local data to the "online" views.
      await tx.execute(
        'INSERT INTO assets(id, description, customer_id, user_id) SELECT id, description, customer_id, ? FROM inactive_local_assets',
        [userId]
      );

      // Delete the "local-only" data.
      await tx.execute('DELETE FROM inactive_local_customers');
      await tx.execute('DELETE FROM inactive_local_assets');
    });

    for (let i = 0; i < 3; i++) {
      await powersync.execute('INSERT INTO assets(id, make, customer_id) VALUES (uuid(), ?, ?)', ['test', uuid()]);
    }
    await new Promise<void>((resolve) => setTimeout(resolve, throttleDuration * 2));
    abortController.abort();

    expect(lastResult).toBe(6);
  });
});

export async function getSourceTables(db: AbstractPowerSyncDatabase, sql: string, parameters: Array<any> = []) {
  const rows = await db.getAll<{ opcode: string; p3: number; p2: string }>(`EXPLAIN ${sql}`, parameters);
  const rootpages: number[] = [];

  for (const row of rows) {
    if (row.opcode === 'OpenRead' && row.p3 === 0 && typeof row.p2 === 'number') {
      rootpages.push(row.p2);
    }
  }

  const tableRows = await db.getAll<{ tbl_name: string }>(
    `SELECT tbl_name FROM sqlite_master WHERE rootpage IN (SELECT json_each.value FROM json_each(?))`,
    [JSON.stringify(rootpages)]
  );

  return tableRows.map((row: { tbl_name: string }) => row.tbl_name);
}
