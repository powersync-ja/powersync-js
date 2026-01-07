import { PowerSyncDatabase, WebPowerSyncDatabaseOptions } from '@powersync/web';
import { v4 as uuid } from 'uuid';
import { onTestFinished } from 'vitest';
import { TEST_SCHEMA } from './test-schema';

export const generateTestDb = (options?: WebPowerSyncDatabaseOptions) => {
  const resolvedOptions = options ?? {
    database: {
      dbFilename: `${uuid()}.db`
    },
    schema: TEST_SCHEMA,
    flags: {
      enableMultiTabs: false
    }
  };

  const db = new PowerSyncDatabase(resolvedOptions);

  onTestFinished(async () => {
    if (db.closed) {
      return;
    }
    await db.disconnectAndClear();
    await db.close();
  });

  return db;
};
