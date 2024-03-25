import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { v4 as uuid } from 'uuid';
import { AbstractPowerSyncDatabase } from '@journeyapps/powersync-sdk-common';
import { WASQLitePowerSyncDatabaseOpenFactory } from '@journeyapps/powersync-sdk-web';
import { testSchema } from './utils/test-schema';
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
  const factory = new WASQLitePowerSyncDatabaseOpenFactory({
    dbFilename: 'test-watch.db',
    schema: testSchema,
    flags: {
      enableMultiTabs: false
    }
  });

  let powersync: AbstractPowerSyncDatabase;

  beforeEach(async () => {
    powersync = factory.getInstance();
  });

  afterEach(async () => {
    await powersync.disconnectAndClear();
    await powersync.close();
  });

  it('watch outside throttle limits', async () => {
    const abortController = new AbortController();

    const watch = powersync.watch(
      'SELECT count() AS count FROM assets INNER JOIN customers ON customers.id = assets.customer_id',
      [],
      { signal: abortController.signal, throttleMs: throttleDuration }
    );

    const updatesCount = 2;
    let receivedUpdatesCount = 0;

    /**
     * Promise which resolves once we received the same amount of update
     * notifications as there are inserts.
     */
    const receivedUpdates = new Promise<void>(async (resolve) => {
      for await (const update of watch) {
        receivedUpdatesCount++;
        if (receivedUpdatesCount == updatesCount) {
          abortController.abort();
          resolve();
        }
      }
    });

    for (let updateCount = 0; updateCount < updatesCount; updateCount++) {
      await powersync.execute('INSERT INTO assets(id, make, customer_id) VALUES (uuid(), ?, ?)', ['test', uuid()]);

      // Wait the throttle duration, ensuring a watch update for each insert
      await new Promise<void>((resolve) => setTimeout(resolve, throttleDuration));
    }

    await receivedUpdates;
    expect(receivedUpdatesCount).equals(updatesCount);
  });

  it('watch inside throttle limits', async () => {
    const abortController = new AbortController();

    const watch = powersync.watch(
      'SELECT count() AS count FROM assets INNER JOIN customers ON customers.id = assets.customer_id',
      [],
      { signal: abortController.signal, throttleMs: throttleDuration }
    );

    const updatesCount = 5;
    let receivedUpdatesCount = 0;
    // Listen to updates
    (async () => {
      for await (const update of watch) {
        receivedUpdatesCount++;
      }
    })();

    // Create the inserts as fast as possible
    for (let updateCount = 0; updateCount < updatesCount; updateCount++) {
      await powersync.execute('INSERT INTO assets(id, make, customer_id) VALUES (uuid(), ?, ?)', ['test', uuid()]);
    }

    await new Promise<void>((resolve) => setTimeout(resolve, throttleDuration * 2));
    abortController.abort();

    // There should be one initial result plus one throttled result
    expect(receivedUpdatesCount).equals(2);
  });

  it('should only watch tables inside query', async () => {
    const assetsAbortController = new AbortController();

    const watchAssets = powersync.watch('SELECT count() AS count FROM assets', [], {
      signal: assetsAbortController.signal
    });

    const customersAbortController = new AbortController();

    const watchCustomers = powersync.watch('SELECT count() AS count FROM customers', [], {
      signal: customersAbortController.signal
    });

    let receivedAssetsUpdatesCount = 0;
    // Listen to assets updates
    (async () => {
      for await (const update of watchAssets) {
        receivedAssetsUpdatesCount++;
      }
    })();

    let receivedCustomersUpdatesCount = 0;
    (async () => {
      for await (const update of watchCustomers) {
        receivedCustomersUpdatesCount++;
      }
    })();

    // Create the inserts as fast as possible
    await powersync.execute('INSERT INTO assets(id, make, customer_id) VALUES (uuid(), ?, ?)', ['test', uuid()]);

    await new Promise<void>((resolve) => setTimeout(resolve, throttleDuration * 2));
    assetsAbortController.abort();
    customersAbortController.abort();

    // There should be one initial result plus one throttled result
    expect(receivedAssetsUpdatesCount).equals(2);

    // Only the initial result should have yielded.
    expect(receivedCustomersUpdatesCount).equals(1);
  });
});
