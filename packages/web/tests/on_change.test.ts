import { AbstractPowerSyncDatabase, WatchOnChangeEvent } from '@powersync/common';
import { PowerSyncDatabase } from '@powersync/web';
import { v4 as uuid } from 'uuid';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { testSchema } from './utils/testDb';

const UPLOAD_TIMEOUT_MS = 3000;

describe('OnChange Tests', { sequential: true }, () => {
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
    const onChange = vi.fn((event: WatchOnChangeEvent) => {
      changedTables.push(...event.changedTables);
    });

    powersync.onChange({ onChange }, { tables: tablesToWatch, signal: abortController.signal });
    await powersync.execute('INSERT INTO assets(id, make, customer_id) VALUES (uuid(), ?, ?)', ['test', uuid()]);
    await vi.waitFor(
      () => {
        expect(onChange).toHaveBeenCalled();
      },
      {
        timeout: UPLOAD_TIMEOUT_MS
      }
    );

    abortController.abort();
    expect(changedTables).toEqual(expectedChangedTables);
  }

  it('basic onChange test', async () => {
    await runOnChangeTest(['assets'], ['ps_data__assets']);
  });

  it('internal "ps_data" table onChange test', async () => {
    await runOnChangeTest(['ps_data__assets'], ['ps_data__assets']);
  });

  it('internal "ps_crud" table onChange test', async () => {
    await runOnChangeTest(['ps_crud'], ['ps_crud']);
  });
});
