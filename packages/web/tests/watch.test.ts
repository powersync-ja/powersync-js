import {
  AbstractPowerSyncDatabase,
  EMPTY_DIFFERENTIAL,
  GetAllQuery,
  IncrementalWatchMode,
  WatchedQueryState
} from '@powersync/common';
import { PowerSyncDatabase } from '@powersync/web';
import { v4 as uuid } from 'uuid';
import { afterEach, beforeEach, describe, expect, it, onTestFinished, vi } from 'vitest';
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

    await receivedError;
    abortController.abort();

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

  it('should stream watch results', async () => {
    const watch = powersync
      .incrementalWatch({
        mode: IncrementalWatchMode.COMPARISON
      })
      .build({
        watch: {
          query: new GetAllQuery({
            sql: 'SELECT * FROM assets',
            parameters: []
          }),
          placeholderData: []
        }
      });

    const getNextState = () =>
      new Promise<WatchedQueryState<any>>((resolve) => {
        const dispose = watch.subscribe({
          onStateChange: (state) => {
            dispose();
            resolve(state);
          }
        });
      });

    let state = watch.state;
    expect(state.isFetching).true;
    expect(state.isLoading).true;

    state = await getNextState();
    expect(state.isFetching).false;
    expect(state.isLoading).false;

    const nextStatePromise = getNextState();
    await powersync.execute('INSERT INTO assets(id, make, customer_id) VALUES (uuid(), ?, ?)', ['test', uuid()]);
    state = await nextStatePromise;
    expect(state!.isFetching).true;

    state = await getNextState();
    expect(state.isFetching).false;
    expect(state.data).toHaveLength(1);
  });

  it('should only report updates for relevant changes', async () => {
    const watch = powersync
      .incrementalWatch({
        mode: IncrementalWatchMode.COMPARISON
      })
      .build({
        watch: {
          query: {
            compile: () => ({
              sql: 'SELECT * FROM assets where make = ?',
              parameters: ['test']
            }),
            execute: ({ sql, parameters }) => powersync.getAll(sql, parameters)
          },
          placeholderData: []
        }
      });

    let notificationCount = 0;
    const dispose = watch.subscribe({
      onData: () => {
        notificationCount++;
      }
    });
    onTestFinished(dispose);

    // Should only trigger for this operation
    await powersync.execute('INSERT INTO assets(id, make, customer_id) VALUES (uuid(), ?, ?)', ['test', uuid()]);

    // Should not trigger for these operations
    await powersync.execute('INSERT INTO assets(id, make, customer_id) VALUES (uuid(), ?, ?)', ['make1', uuid()]);
    await powersync.execute('INSERT INTO assets(id, make, customer_id) VALUES (uuid(), ?, ?)', ['make2', uuid()]);
    await powersync.execute('INSERT INTO assets(id, make, customer_id) VALUES (uuid(), ?, ?)', ['make3', uuid()]);
    await powersync.execute('INSERT INTO assets(id, make, customer_id) VALUES (uuid(), ?, ?)', ['make4', uuid()]);

    // The initial result with no data is equal to the default state/
    // We should only receive one notification when the data is updated
    expect(notificationCount).equals(1);
    expect(watch.state.data).toHaveLength(1);
  });

  it('should not report fetching status', async () => {
    const watch = powersync
      .incrementalWatch({
        mode: IncrementalWatchMode.COMPARISON
      })
      .build({
        watch: {
          query: {
            compile: () => ({
              sql: 'SELECT * FROM assets where make = ?',
              parameters: ['test']
            }),
            execute: ({ sql, parameters }) => powersync.getAll(sql, parameters)
          },
          placeholderData: [],
          reportFetching: false
        }
      });

    expect(watch.state.isFetching).false;

    let notificationCount = 0;
    const dispose = watch.subscribe({
      onStateChange: () => {
        notificationCount++;
      }
    });
    onTestFinished(dispose);

    // Should only a state change trigger for this operation
    await powersync.execute('INSERT INTO assets(id, make, customer_id) VALUES (uuid(), ?, ?)', ['test', uuid()]);

    // Should not trigger any state change for these operations
    await powersync.execute('INSERT INTO assets(id, make, customer_id) VALUES (uuid(), ?, ?)', ['make1', uuid()]);
    await powersync.execute('INSERT INTO assets(id, make, customer_id) VALUES (uuid(), ?, ?)', ['make2', uuid()]);
    await powersync.execute('INSERT INTO assets(id, make, customer_id) VALUES (uuid(), ?, ?)', ['make3', uuid()]);
    await powersync.execute('INSERT INTO assets(id, make, customer_id) VALUES (uuid(), ?, ?)', ['make4', uuid()]);

    // The initial result with no data is equal to the default state/
    // We should only receive one notification when the data is updated
    expect(notificationCount).equals(1);
    expect(watch.state.data).toHaveLength(1);
  });

  it('should allow updating queries', async () => {
    // Create sample data
    await powersync.execute('INSERT INTO assets(id, make, customer_id) VALUES (uuid(), ?, ?)', ['test', uuid()]);
    await powersync.execute('INSERT INTO assets(id, make, customer_id) VALUES (uuid(), ?, ?)', ['nottest', uuid()]);

    const watch = powersync
      .incrementalWatch({
        mode: IncrementalWatchMode.COMPARISON
      })
      .build({
        watch: {
          query: new GetAllQuery<{ make: string }>({
            sql: 'SELECT * FROM assets where make = ?',
            parameters: ['test']
          }),
          placeholderData: [],
          reportFetching: false
        }
      });

    expect(watch.state.isFetching).false;

    await vi.waitFor(
      () => {
        expect(watch.state.isLoading).false;
      },
      { timeout: 1000 }
    );

    expect(watch.state.data).toHaveLength(1);
    expect(watch.state.data[0].make).equals('test');

    await watch.updateSettings({
      placeholderData: [],
      query: new GetAllQuery<{ make: string }>({
        sql: 'SELECT * FROM assets where make = ?',
        parameters: ['nottest']
      })
    });

    expect(watch.state.isLoading).true;

    await vi.waitFor(
      () => {
        expect(watch.state.isLoading).false;
      },
      { timeout: 1000 }
    );

    expect(watch.state.data).toHaveLength(1);
    expect(watch.state.data[0].make).equals('nottest');
  });

  it('should report differential query results', async () => {
    const watch = powersync
      .incrementalWatch({
        mode: IncrementalWatchMode.DIFFERENTIAL
      })
      .build({
        watchOptions: {
          query: new GetAllQuery({
            sql: /* sql */ `
              SELECT
                *
              FROM
                assets
            `,
            transformer: (raw) => {
              return {
                id: raw.id as string,
                make: raw.make as string
              };
            }
          }),
          // TODO make this optional
          placeholderData: EMPTY_DIFFERENTIAL
        }
      });

    // Create sample data
    await powersync.execute(
      /* sql */ `
        INSERT INTO
          assets (id, make, customer_id)
        VALUES
          (uuid (), ?, ?)
      `,
      ['test1', uuid()]
    );

    await vi.waitFor(
      () => {
        expect(watch.state.data.added[0]?.make).equals('test1');
      },
      { timeout: 1000 }
    );

    await powersync.execute(
      /* sql */ `
        INSERT INTO
          assets (id, make, customer_id)
        VALUES
          (uuid (), ?, ?)
      `,
      ['test2', uuid()]
    );

    await vi.waitFor(
      () => {
        // This should now reflect that we had one change since the last event
        expect(watch.state.data.added).toHaveLength(1);
        expect(watch.state.data.added[0]?.make).equals('test2');

        expect(watch.state.data.removed).toHaveLength(0);
        expect(watch.state.data.all).toHaveLength(2);
      },
      { timeout: 1000 }
    );

    await powersync.execute(
      /* sql */ `
        DELETE FROM assets
        WHERE
          make = ?
      `,
      ['test2']
    );

    await vi.waitFor(
      () => {
        expect(watch.state.data.added).toHaveLength(0);
        expect(watch.state.data.all).toHaveLength(1);
        expect(watch.state.data.unchanged).toHaveLength(1);
        expect(watch.state.data.unchanged[0]?.make).equals('test1');

        expect(watch.state.data.removed).toHaveLength(1);
        expect(watch.state.data.removed[0]?.make).equals('test2');
      },
      { timeout: 1000 }
    );
  });
});
