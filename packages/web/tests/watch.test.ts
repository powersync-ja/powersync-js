import { AbstractPowerSyncDatabase } from '@powersync/common';
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

describe('Watch Tests', { sequential: true }, () => {
  let powersync: AbstractPowerSyncDatabase;

  beforeEach(async () => {
    powersync = new PowerSyncDatabase({
      database: { dbFilename: 'test-watch.db' },
      schema: testSchema,
      flags: {
        enableMultiTabs: false
      }
    });
    await powersync.init();
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

  it('watch outside throttle limits (callback)', async () => {
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

      powersync.watch(
        'SELECT count() AS count FROM assets INNER JOIN customers ON customers.id = assets.customer_id',
        [],
        { onResult: onUpdate },
        { signal: abortController.signal, throttleMs: throttleDuration }
      );
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

  it('watch inside throttle limits (callback)', async () => {
    const abortController = new AbortController();

    const updatesCount = 5;
    let receivedUpdatesCount = 0;

    const onUpdate = () => {
      receivedUpdatesCount++;
    };

    powersync.watch(
      'SELECT count() AS count FROM assets INNER JOIN customers ON customers.id = assets.customer_id',
      [],
      { onResult: onUpdate },
      { signal: abortController.signal, throttleMs: throttleDuration }
    );

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

    // Ensures insert doesn't form part of initial result
    await new Promise<void>((resolve) => setTimeout(resolve, throttleDuration));

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

  it('should only watch tables inside query (callback)', async () => {
    const assetsAbortController = new AbortController();

    let receivedAssetsUpdatesCount = 0;
    const onWatchAssets = () => {
      receivedAssetsUpdatesCount++;
    };

    powersync.watch(
      'SELECT count() AS count FROM assets',
      [],
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

    powersync.watch(
      'SELECT count() AS count FROM customers',
      [],
      { onResult: onWatchCustomers },
      {
        signal: customersAbortController.signal
      }
    );

    // Ensures insert doesn't form part of initial result
    await new Promise<void>((resolve) => setTimeout(resolve, throttleDuration));

    await powersync.execute('INSERT INTO assets(id, make, customer_id) VALUES (uuid(), ?, ?)', ['test', uuid()]);

    await new Promise<void>((resolve) => setTimeout(resolve, throttleDuration * 2));
    assetsAbortController.abort();
    customersAbortController.abort();

    // There should be one initial result plus one throttled result
    expect(receivedAssetsUpdatesCount).equals(2);

    // Only the initial result should have yielded.
    expect(receivedCustomersUpdatesCount).equals(1);
  });

  it('should handle watch onError callback', async () => {
    const abortController = new AbortController();
    const onResult = () => {}; // no-op
    let receivedErrorCount = 0;

    const receivedError = new Promise<void>((resolve) => {
      const onError = () => {
        receivedErrorCount++;
        resolve();
      };

      powersync.watch(
        'INVALID SQL QUERY', // Simulate an error with bad SQL
        [],
        { onResult, onError },
        { signal: abortController.signal, throttleMs: throttleDuration }
      );
    });
    abortController.abort();

    await receivedError;
    expect(receivedErrorCount).equals(1);
  });

  it('should throttle watch callback overflow', async () => {
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

      powersync.watch(
        'SELECT count() AS count FROM assets',
        [],
        { onResult: onResultOverflow },
        { signal: overflowAbortController.signal, throttleMs: 1 }
      );
    });

    await firstResultReceived;

    // Perform a large number of inserts to trigger overflow
    for (let i = 0; i < updatesCount; i++) {
      powersync.execute('INSERT INTO assets(id, make, customer_id) VALUES (uuid(), ?, ?)', ['test', uuid()]);
    }

    await new Promise<void>((resolve) => setTimeout(resolve, 1 * throttleDuration));

    overflowAbortController.abort();

    // This fluctuates between 3 and 4 based on timing, but should never be 25
    expect(receivedWithManagedOverflowCount).greaterThan(2);
    expect(receivedWithManagedOverflowCount).toBeLessThanOrEqual(4);
  });
});
