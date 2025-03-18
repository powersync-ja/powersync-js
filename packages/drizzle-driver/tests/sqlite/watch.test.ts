import { AbstractPowerSyncDatabase, column, Schema, Table } from '@powersync/common';
import { PowerSyncDatabase } from '@powersync/web';
import { count, eq, relations, sql } from 'drizzle-orm';
import { integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as SUT from '../../src/sqlite/PowerSyncSQLiteDatabase';

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

const assets = sqliteTable(
  'assets',
  {
    id: text('id'),
    created_at: text('created_at'),
    make: text('make'),
    model: text('model'),
    serial_number: text('serial_number'),
    quantity: integer('quantity'),
    user_id: text('user_id'),
    customer_id: text('customer_id'),
    description: text('description')
  },
  (table) => ({
    makemodelIndex: uniqueIndex('makemodel').on(table.make, table.model)
  })
);

const customers = sqliteTable('customers', {
  id: text('id'),
  name: text('name'),
  email: text('email')
});

export const customersRelations = relations(customers, ({ many }) => ({
  assets: many(assets)
}));

export const assetsRelations = relations(assets, ({ one }) => ({
  customer: one(customers, {
    fields: [assets.customer_id],
    references: [customers.id]
  })
}));

const DrizzleSchema = { assets, customers, assetsRelations, customersRelations };

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
  let db: SUT.PowerSyncSQLiteDatabase<typeof DrizzleSchema>;

  beforeEach(async () => {
    powerSyncDb = new PowerSyncDatabase({
      database: {
        dbFilename: 'test.db'
      },
      schema: PsSchema
    });
    db = SUT.wrapPowerSyncWithDrizzle(powerSyncDb, { schema: DrizzleSchema, logger: { logQuery: () => {} } });

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
        .select({ count: count() })
        .from(assets)
        .innerJoin(customers, eq(customers.id, assets.customer_id));

      db.watch(query, { onResult: onUpdate }, { signal: abortController.signal, throttleMs: throttleDuration });
    });

    for (let updateCount = 0; updateCount < updatesCount; updateCount++) {
      await db
        .insert(assets)
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
    const query = db.select({ count: count() }).from(assets).innerJoin(customers, eq(customers.id, assets.customer_id));
    db.watch(query, { onResult: onUpdate }, { signal: abortController.signal, throttleMs: throttleDuration });

    // Create the inserts as fast as possible
    for (let updateCount = 0; updateCount < updatesCount; updateCount++) {
      await db
        .insert(assets)
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

    const queryAssets = db.select({ count: count() }).from(assets);

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

    const queryCustomers = db.select({ count: count() }).from(customers);
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
      .insert(assets)
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

      const query = db
        .select({
          id: sql`fakeFunction()` // Simulate an error with invalid function
        })
        .from(assets);

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
      const query = db.select({ count: count() }).from(assets);
      db.watch(query, { onResult: onResultOverflow }, { signal: overflowAbortController.signal, throttleMs: 1 });
    });

    await firstResultReceived;

    // Perform a large number of inserts to trigger overflow
    for (let i = 0; i < updatesCount; i++) {
      db.insert(assets)
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

  it('should contain relational data (one to many)', async () => {
    const abortController = new AbortController();

    const query = db.query.customers.findMany({ with: { assets: true } });

    let receivedResult: any = undefined;

    const receivedUpdates = new Promise<void>((resolve) => {
      const onUpdate = (update) => {
        receivedResult = update;
        resolve();
      };

      db.watch(query, { onResult: onUpdate }, { signal: abortController.signal });
    });

    const customerId = '39281cf9-9989-4b31-bb21-8f45ce3b3e60';
    const assetId = '00000000-9989-4b31-bb21-8f45ce3b3e61';
    await db
      .insert(customers)
      .values({
        id: customerId,
        name: 'Alice'
      })
      .execute();

    await db
      .insert(assets)
      .values({
        id: assetId,
        customer_id: customerId
      })
      .execute();

    await receivedUpdates;
    abortController.abort();

    expect(receivedResult[0].assets[0]['id']).toEqual(assetId);
    expect(receivedResult[0].assets[0]['customer_id']).toEqual(customerId);
  });

  it('should contain relational data (many to one)', async () => {
    const abortController = new AbortController();

    const query = db.query.assets.findFirst({ with: { customer: true } });

    let receivedResult: any = undefined;

    const receivedUpdates = new Promise<void>((resolve) => {
      const onUpdate = (update) => {
        receivedResult = update;
        resolve();
      };

      db.watch(query, { onResult: onUpdate }, { signal: abortController.signal });
    });

    const customerId = '39281cf9-9989-4b31-bb21-8f45ce3b3e60';
    const assetId = '00000000-9989-4b31-bb21-8f45ce3b3e61';
    await db
      .insert(customers)
      .values({
        id: customerId,
        name: 'Alice'
      })
      .execute();

    await db
      .insert(assets)
      .values({
        id: assetId,
        customer_id: customerId
      })
      .execute();

    await receivedUpdates;
    abortController.abort();

    expect(receivedResult[0].customer['id']).toEqual(customerId);
  });
});
