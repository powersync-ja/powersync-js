import * as commonSdk from '@powersync/common';
import { PowerSyncDatabase } from '@powersync/web';
import { afterEach, describe, expect, it, onTestFinished, vi } from 'vitest';
import { createPowerSyncPlugin } from '../src/composables/powerSync';
import { useStatus } from '../src/composables/useStatus';
import { withSetup } from './utils';

export const openPowerSync = () => {
  const db = new PowerSyncDatabase({
    database: { dbFilename: 'test.db' },
    schema: new commonSdk.Schema({
      lists: new commonSdk.Table({
        name: commonSdk.column.text
      })
    })
  });

  onTestFinished(async () => {
    await db.disconnectAndClear();
    await db.close();
  });

  return db;
};

describe('useStatus', () => {
  let powersync: commonSdk.AbstractPowerSyncDatabase | null;

  beforeEach(() => {
    powersync = openPowerSync();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  const withPowerSyncSetup = <Result>(callback: () => Result) => {
    return withSetup(callback, (app) => {
      const { install } = createPowerSyncPlugin({ database: powersync! });
      install(app);
    });
  };

  it('should load the status of PowerSync', async () => {
    const [status] = withPowerSyncSetup(() => useStatus());
    expect(status.value.connected).toBe(false);
  });
});
