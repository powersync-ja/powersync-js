import { AbstractPowerSyncDatabase, column, Schema, Table } from '@powersync/common';
import { PowerSyncDatabase } from '@powersync/web';
import { sql } from 'kysely';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as SUT from '../../src/sqlite/db';

vi.useRealTimers();

const assetsPs = new Table(
  {
    created_at: column.text,
    make: column.text,
    model: column.text,
    serial_number: column.text,
    quantity: column.integer,
    user_id: column.text,
    customer_id: column.text,
    description: column.text
  },
  { indexes: { makemodel: ['make, model'] } }
);

const customersPs = new Table({
  name: column.text,
  email: column.text
});

const PsSchema = new Schema({ assets: assetsPs, customers: customersPs });
export type Database = (typeof PsSchema)['types'];

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
  let powerSyncDb: AbstractPowerSyncDatabase;
  let db: SUT.PowerSyncKyselyDatabase<Database>;

  beforeEach(async () => {
    powerSyncDb = new PowerSyncDatabase({
      database: {
        dbFilename: 'test.db'
      },
      schema: PsSchema
    });
    db = SUT.wrapPowerSyncWithKysely<Database>(powerSyncDb);

    await powerSyncDb.init();
  });

  afterEach(async () => {
    await powerSyncDb.disconnectAndClear();
  });

  it('watch outside throttle limits', async () => {
    const abortController = new AbortController();

    const updatesCount = 2;
    let receivedUpdatesCount = 0;

    /**
     * Promise which resolves once we received the same amount of update
     * notifications as there are inserts.
     */
    const receivedUpdates = new Promise<void>((resolve) => {
      const onUpdate = () => {
        receivedUpdatesCount++;

        if (receivedUpdatesCount == updatesCount) {
          abortController.abort();
          resolve();
        }
      };

      const query = db
        .selectFrom('assets')
        .innerJoin('customers', 'customers.id', 'assets.customer_id')
        .select(db.fn.count('assets.id').as('count'));

      db.watch(query, { onResult: onUpdate }, { signal: abortController.signal, throttleMs: throttleDuration });
    });

    for (let updateCount = 0; updateCount < updatesCount; updateCount++) {
      await db
        .insertInto('assets')
        .values({
          id: sql`uuid()`,
          make: 'test',
          customer_id: sql`uuid()`
        })
        .execute();

      // Wait the throttle duration, ensuring a watch update for each insert
      await new Promise<void>((resolve) => setTimeout(resolve, throttleDuration));
    }

    await receivedUpdates;
    expect(receivedUpdatesCount).equals(updatesCount);
  });

  it('watch inside throttle limits', async () => {
    const abortController = new AbortController();

    const updatesCount = 5;
    let receivedUpdatesCount = 0;

    const onUpdate = () => {
      receivedUpdatesCount++;
    };

    const query = db
      .selectFrom('assets')
      .innerJoin('customers', 'customers.id', 'assets.customer_id')
      .select(db.fn.count('assets.id').as('count'));

    db.watch(query, { onResult: onUpdate }, { signal: abortController.signal, throttleMs: throttleDuration });

    // Create the inserts as fast as possible
    for (let updateCount = 0; updateCount < updatesCount; updateCount++) {
      await db
        .insertInto('assets')
        .values({
          id: sql`uuid()`,
          make: 'test',
          customer_id: sql`uuid()`
        })
        .execute();
    }

    await new Promise<void>((resolve) => setTimeout(resolve, throttleDuration * 2));
    abortController.abort();

    // There should be one initial result plus one throttled result
    expect(receivedUpdatesCount).equals(2);
  });

  it('should only watch tables inside query', async () => {
    const assetsAbortController = new AbortController();

    let receivedAssetsUpdatesCount = 0;
    const onWatchAssets = () => {
      receivedAssetsUpdatesCount++;
    };

    const queryAssets = db.selectFrom('assets').select(db.fn.count('assets.id').as('count'));
    db.watch(
      queryAssets,
      { onResult: onWatchAssets },
      {
        signal: assetsAbortController.signal
      }
    );

    const customersAbortController = new AbortController();

    let receivedCustomersUpdatesCount = 0;
    const onWatchCustomers = () => {
      receivedCustomersUpdatesCount++;
    };

    const queryCustomers = db.selectFrom('customers').select(db.fn.count('customers.id').as('count'));

    db.watch(
      queryCustomers,
      { onResult: onWatchCustomers },
      {
        signal: customersAbortController.signal
      }
    );

    // Ensures insert doesn't form part of initial result
    await new Promise<void>((resolve) => setTimeout(resolve, throttleDuration));

    await db
      .insertInto('assets')
      .values({
        id: sql`uuid()`,
        make: 'test',
        customer_id: sql`uuid()`
      })
      .execute();

    await new Promise<void>((resolve) => setTimeout(resolve, throttleDuration * 2));
    assetsAbortController.abort();
    customersAbortController.abort();

    // There should be one initial result plus one throttled result
    expect(receivedAssetsUpdatesCount).equals(2);

    // Only the initial result should have yielded.
    expect(receivedCustomersUpdatesCount).equals(1);
  });

  it('should handle watch onError', async () => {
    const abortController = new AbortController();
    const onResult = () => {}; // no-op
    let receivedErrorCount = 0;

    const receivedError = new Promise<void>(async (resolve) => {
      const onError = () => {
        receivedErrorCount++;
        resolve();
      };

      const query = db.selectFrom('assets').select([
        () => {
          const fullName = sql<string>`fakeFunction()`; // Simulate an error with invalid function
          return fullName.as('full_name');
        }
      ]);

      db.watch(query, { onResult, onError }, { signal: abortController.signal, throttleMs: throttleDuration });
    });
    abortController.abort();

    await receivedError;
    expect(receivedErrorCount).equals(1);
  });

  it('should throttle watch overflow', async () => {
    const overflowAbortController = new AbortController();
    const updatesCount = 25;

    let receivedWithManagedOverflowCount = 0;
    const firstResultReceived = new Promise<void>((resolve) => {
      const onResultOverflow = () => {
        if (receivedWithManagedOverflowCount === 0) {
          resolve();
        }
        receivedWithManagedOverflowCount++;
      };

      const query = db.selectFrom('assets').select(db.fn.count('assets.id').as('count'));
      db.watch(query, { onResult: onResultOverflow }, { signal: overflowAbortController.signal, throttleMs: 1 });
    });

    await firstResultReceived;

    // Perform a large number of inserts to trigger overflow
    for (let i = 0; i < updatesCount; i++) {
      db.insertInto('assets')
        .values({
          id: sql`uuid()`,
          make: 'test',
          customer_id: sql`uuid()`
        })
        .execute();
    }

    await new Promise<void>((resolve) => setTimeout(resolve, 1 * throttleDuration));

    overflowAbortController.abort();

    // This fluctuates between 3 and 4 based on timing, but should never be 25
    expect(receivedWithManagedOverflowCount).greaterThan(2);
    expect(receivedWithManagedOverflowCount).toBeLessThanOrEqual(4);
  });
});
