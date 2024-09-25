import { AbstractPowerSyncDatabase, WatchOnChangeEvent } from '@powersync/common';
import { PowerSyncDatabase } from '@powersync/web';
import { v4 as uuid } from 'uuid';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { testSchema } from './utils/testDb';
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

describe('Watch Tests', () => {
  let powersync: AbstractPowerSyncDatabase;

  beforeEach(async () => {
    powersync = new PowerSyncDatabase({
      database: { dbFilename: 'test-watch.db' },
      schema: testSchema,
      flags: {
        enableMultiTabs: false
      }
    });
  });

  afterEach(async () => {
    await powersync.disconnectAndClear();
    await powersync.close();
  });

  async function runOnChangeTest(tablesToWatch: string[], expectedChangedTables: string[]) {
    const changedTables: string[] = [];
    const abortController = new AbortController();
    const onChange = (event: WatchOnChangeEvent) => {
      changedTables.push(...event.changedTables);
    };

    powersync.onChange(
      { onChange },
      { tables: tablesToWatch, signal: abortController.signal, throttleMs: throttleDuration }
    );

    await powersync.execute('INSERT INTO assets(id, make, customer_id) VALUES (uuid(), ?, ?)', ['test', uuid()]);
    await new Promise<void>((resolve) => setTimeout(resolve, throttleDuration));

    abortController.abort();
    expect(changedTables).toEqual(expectedChangedTables);
  }

  it('basic onChange test', async () => {
    await runOnChangeTest(['assets'], ['ps_data__assets']);
  });

  it('internal "ps_data" table onChange test', async () => {
    await runOnChangeTest(['ps_data__assets'], ['ps_data__assets']);
  });

  it('internal "ps_oplog" table onChange test', async () => {
    await runOnChangeTest(['ps_oplog'], ['ps_oplog']);
  });
});
