import { WebPowerSyncDatabaseOptions } from '@powersync/web';
import Logger from 'js-logger';
import p from 'p-defer';
import { v4 } from 'uuid';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { DEFAULT_CONNECTED_POWERSYNC_OPTIONS, generateConnectedDatabase } from './utils/generateConnectedDatabase';

// Don't want to actually export the warning string from the package
const PARTIAL_WARNING = 'Potentially previously uploaded CRUD entries are still present';

describe(
  'CRUD Uploads - With Web Workers',
  { sequential: true },
  describeCrudUploadTests(() => ({
    database: {
      dbFilename: `${v4()}.db`
    },
    schema: DEFAULT_CONNECTED_POWERSYNC_OPTIONS.powerSyncOptions.schema,
    crudUploadThrottleMs: 1_000,
    flags: {
      enableMultiTabs: false
    }
  }))
);

describe(
  'CRUD Uploads - Without Web Workers',
  { sequential: true },
  describeCrudUploadTests(() => ({
    database: {
      dbFilename: `crud-uploads-test-${v4()}.db`
    },
    schema: DEFAULT_CONNECTED_POWERSYNC_OPTIONS.powerSyncOptions.schema,
    crudUploadThrottleMs: 1_000,
    flags: {
      useWebWorker: false
    }
  }))
);

function describeCrudUploadTests(getDatabaseOptions: () => WebPowerSyncDatabaseOptions) {
  return () => {
    beforeAll(() => Logger.useDefaults());

    it('should warn for missing upload operations in uploadData', async () => {
      const logger = Logger.get('crud-logger');

      const options = getDatabaseOptions();

      const { powersync, uploadSpy } = await generateConnectedDatabase({
        powerSyncOptions: {
          ...options,
          logger
        }
      });

      const loggerSpy = vi.spyOn(logger, 'warn');

      const deferred = p();

      uploadSpy.mockImplementation(async (db) => {
        // This upload method does not perform an upload
        deferred.resolve();
      });

      // Create something with CRUD in it.
      await powersync.execute('INSERT into users (id, name) VALUES (uuid(), ?)', ['steven']);

      // The empty upload handler should have been called
      // Timeouts seem to be weird in Vitest Browser mode.
      // This makes the check below more stable.
      await deferred.promise;

      await vi.waitFor(
        () => {
          expect(loggerSpy.mock.calls.find((logArgs) => logArgs[0].includes(PARTIAL_WARNING))).exist;
        },
        {
          timeout: 500,
          interval: 100
        }
      );
    });

    it('should immediately upload sequential transactions', async () => {
      const logger = Logger.get('crud-logger');

      const options = getDatabaseOptions();

      const { powersync, uploadSpy } = await generateConnectedDatabase({
        powerSyncOptions: {
          ...options,
          logger
        }
      });

      const loggerSpy = vi.spyOn(logger, 'warn');

      const deferred = p();

      uploadSpy.mockImplementation(async (db) => {
        const nextTransaction = await db.getNextCrudTransaction();
        if (!nextTransaction) {
          return;
        }
        // Mockingly delete the crud op in order to progress through the CRUD queue
        for (const op of nextTransaction.crud) {
          await db.execute(`DELETE FROM ps_crud WHERE id = ?`, [op.clientId]);
        }

        deferred.resolve();
      });

      // Create the first item
      await powersync.execute('INSERT into users (id, name) VALUES (uuid(), ?)', ['steven']);

      // Modify the first item in a new transaction
      await powersync.execute(`
          UPDATE
              users
          SET
              name = 'Mugi'
          WHERE
              name = 'steven'`);

      // Create a second item
      await powersync.execute('INSERT into users (id, name) VALUES (uuid(), ?)', ['steven2']);

      // The empty upload handler should have been called.
      // Timeouts seem to be weird in Vitest Browser mode.
      // This makes the check below more stable.
      await deferred.promise;

      await vi.waitFor(
        () => {
          expect(uploadSpy.mock.calls.length).eq(3);
        },
        {
          timeout: 5_000,
          interval: 300
        }
      );

      expect(loggerSpy.mock.calls.find((logArgs) => logArgs[0].includes(PARTIAL_WARNING))).toBeUndefined;
    });
  };
}
