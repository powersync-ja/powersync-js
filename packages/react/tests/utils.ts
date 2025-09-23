import * as commonSdk from '@powersync/common';

import { PowerSyncDatabase } from '@powersync/web';
import { onTestFinished } from 'vitest';

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
    // backport for https://github.com/powersync-ja/powersync-sqlite-core, disconnectAndClear is supposed to do this.
    await db.execute('DELETE FROM ps_stream_subscriptions');

    await db.disconnectAndClear();
    await db.close();
  });

  return db;
};
