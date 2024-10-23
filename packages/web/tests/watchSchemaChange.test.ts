import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { v4 as uuid } from 'uuid';
import { AbstractPowerSyncDatabase, QueryResult } from '@powersync/common';
import { PowerSyncDatabase } from '@powersync/web';
import { testSchema } from './utils/testDb';
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

describe('Watch With Schema Change Tests', () => {
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

    const onUpdate = (results: QueryResult) => {
      lastResult = results.rows?._array[0].count; // `count` from sql output
    };

    powersync.watch(
      'SELECT count() AS count FROM assets',
      [],
      { onResult: onUpdate },
      { signal: abortController.signal, throttleMs: throttleDuration }
    );

    // Insert 3 records
    for (let i = 0; i < 3; i++) {
      await powersync.execute('INSERT INTO assets(id, make, customer_id) VALUES (uuid(), ?, ?)', ['test', userId]);
    }
    await new Promise<void>((resolve) => setTimeout(resolve, throttleDuration * 2));

    expect(lastResult).toBe(3);

    // changes the underlying table that the `assets` and `customers` views are based on
    await powersync.updateSchema(makeOptionalSyncSchema(true));

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

    expect(lastResult).toBe(6);
  });
});
