import * as commonSdk from '@powersync/common';

import { cleanup } from '@testing-library/react';
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
    cleanup();
    await new Promise((resolve) => setTimeout(resolve, 100));
    await db.disconnectAndClear();
    await db.close();
  });

  return db;
};
