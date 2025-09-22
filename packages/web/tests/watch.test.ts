import {
  AbstractPowerSyncDatabase,
  ArrayComparator,
  GetAllQuery,
  QueryResult,
  WatchedQueryDifferential,
  WatchedQueryState
} from '@powersync/common';
import { PowerSyncDatabase } from '@powersync/web';
import { v4 as uuid } from 'uuid';
import { afterEach, beforeEach, describe, expect, it, onTestFinished, vi } from 'vitest';
import { TestDatabase, testSchema } from './utils/testDb';
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

  it('should allow overriding table dependencies', async () => {
    const assetsAbortController = new AbortController();

    type CustomerAssetJoin = TestDatabase['assets'] & { customer_name: string; customer_email: string };
    const results: CustomerAssetJoin[][] = [];

    const onWatchAssets = (resultSet: CustomerAssetJoin[]) => {
      results.push(resultSet);
    };

    const { id: customerId } = await powersync.get<{ id: string }>(`SELECT uuid() as id`);

    await powersync.execute(
      /* sql */ `
        INSERT INTO
          customers (id, name, email)
        VALUES
          (?, ?, ?)
      `,
      [customerId, 'bob', 'bob@powersync.com']
    );

    await powersync.execute(
      /* sql */ `
        INSERT into
          assets (id, make, model, customer_id)
        VALUES
          (uuid (), 'sync_engine', 'powersync', ?)
      `,
      [customerId]
    );

    powersync.watch(
      /* sql */
      `
        SELECT
          assets.make,
          assets.model,
          assets.serial_number,
          customers.name AS customer_name,
          customers.email AS customer_email
        FROM
          assets
          LEFT JOIN customers ON assets.customer_id = customers.id;
      `,
      [],
      { onResult: (r) => onWatchAssets(r.rows?._array ?? []) },
      {
        signal: assetsAbortController.signal,
        // Only trigger on changes to the customers table
        tables: ['customers'],
        throttleMs: 0
      }
    );

    await vi.waitFor(
      () => {
        expect(results.length).eq(1);
        expect(results[0].length).eq(1);
      },
      {
        timeout: 1000
      }
    );

    // Do an update on the assets table, this should not trigger the watched query
    // due to the override
    for (let attemptCount = 0; attemptCount < 5; attemptCount++) {
      await powersync.execute(
        /* sql */ `
          INSERT into
            assets (id, make, model, customer_id)
          VALUES
            (uuid (), 'sync_engine', 'powersync_v2', ?)
        `,
        [customerId]
      );
      // Give some time for watched queries to fire (if they need to)
      await new Promise((r) => setTimeout(r, 100));
    }

    // now trigger an update on the customers table, this should update the watched query
    await powersync.execute(
      /* sql */ `
        INSERT INTO
          customers (id, name, email)
        VALUES
          (uuid (), ?, ?)
      `,
      ['test', 'test@powersync.com']
    );

    await vi.waitFor(
      () => {
        expect(results.length).eq(2);
      },
      { timeout: 1000 }
    );
  });

  it('should allow overriding table dependencies (query api)', async () => {
    const { id: customerId } = await powersync.get<{ id: string }>(`SELECT uuid() as id`);

    await powersync.execute(
      /* sql */ `
        INSERT INTO
          customers (id, name, email)
        VALUES
          (?, ?, ?)
      `,
      [customerId, 'bob', 'bob@powersync.com']
    );

    await powersync.execute(
      /* sql */ `
        INSERT into
          assets (id, make, model, customer_id)
        VALUES
          (uuid (), 'sync_engine', 'powersync', ?)
      `,
      [customerId]
    );

    type CustomerAssetJoin = TestDatabase['assets'] & { customer_name: string; customer_email: string };
    const results: CustomerAssetJoin[][] = [];

    const query = powersync
      .query<CustomerAssetJoin>({
        sql:
          /* sql */
          `
            SELECT
              assets.make,
              assets.model,
              assets.serial_number,
              customers.name AS customer_name,
              customers.email AS customer_email
            FROM
              assets
              LEFT JOIN customers ON assets.customer_id = customers.id;
          `
      })
      .watch({
        triggerOnTables: ['customers'],
        throttleMs: 0
      });

    query.registerListener({
      onData: (data) => {
        results.push([...data]);
      }
    });

    await vi.waitFor(
      () => {
        expect(results.length).eq(1);
        expect(results[0].length).eq(1);
      },
      {
        timeout: 1000
      }
    );

    // Do an update on the assets table, this should not trigger the watched query
    // due to the override
    for (let attemptCount = 0; attemptCount < 5; attemptCount++) {
      await powersync.execute(
        /* sql */ `
          INSERT into
            assets (id, make, model, customer_id)
          VALUES
            (uuid (), 'sync_engine', 'powersync_v2', ?)
        `,
        [customerId]
      );
      // Give some time for watched queries to fire (if they need to)
      await new Promise((r) => setTimeout(r, 100));
    }

    // now trigger an update on the customers table, this should update the watched query
    await powersync.execute(
      /* sql */ `
        INSERT INTO
          customers (id, name, email)
        VALUES
          (uuid (), ?, ?)
      `,
      ['test', 'test@powersync.com']
    );

    await vi.waitFor(
      () => {
        expect(results.length).eq(2);
      },
      { timeout: 1000 }
    );
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
      .query({
        sql: 'SELECT * FROM assets',
        parameters: []
      })
      .watch();

    const getNextState = () =>
      new Promise<WatchedQueryState<any>>((resolve) => {
        const dispose = watch.registerListener({
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

  it('should compare results with old watch method', async () => {
    const controller = new AbortController();

    const resultSets: QueryResult[] = [];

    // Wait for the first query load
    await new Promise<void>((resolve) => {
      powersync.watch(
        'SELECT * FROM assets WHERE make = ?',
        ['test'],
        {
          onResult: (result) => {
            // Mark that we received the first result, this helps with counting events.
            resolve();
            resultSets.push(result);
          }
        },
        {
          signal: controller.signal,
          comparator: {
            checkEquality: (current, previous) => {
              return JSON.stringify(current) === JSON.stringify(previous);
            }
          }
        }
      );
    });

    onTestFinished(() => controller.abort());

    await powersync.execute('INSERT INTO assets(id, make, customer_id) VALUES (uuid(), ?, ?)', ['test', uuid()]);
    await powersync.execute('INSERT INTO assets(id, make, customer_id) VALUES (uuid(), ?, ?)', ['nottest', uuid()]);
    await powersync.execute('INSERT INTO assets(id, make, customer_id) VALUES (uuid(), ?, ?)', ['nottest', uuid()]);
    await powersync.execute('INSERT INTO assets(id, make, customer_id) VALUES (uuid(), ?, ?)', ['nottest', uuid()]);
    await powersync.execute('INSERT INTO assets(id, make, customer_id) VALUES (uuid(), ?, ?)', ['nottest', uuid()]);
    await powersync.execute('INSERT INTO assets(id, make, customer_id) VALUES (uuid(), ?, ?)', ['nottest', uuid()]);
    await powersync.execute('INSERT INTO assets(id, make, customer_id) VALUES (uuid(), ?, ?)', ['nottest', uuid()]);
    await powersync.execute('INSERT INTO assets(id, make, customer_id) VALUES (uuid(), ?, ?)', ['nottest', uuid()]);
    await powersync.execute('INSERT INTO assets(id, make, customer_id) VALUES (uuid(), ?, ?)', ['test', uuid()]);

    await vi.waitFor(
      () => {
        expect(resultSets[resultSets.length - 1]?.rows?._array?.map((r) => r.make)).deep.eq(['test', 'test']);
        // We should only have updated less than or equal 3 times
        expect(resultSets.length).lessThanOrEqual(3);
      },
      { timeout: 1000, interval: 100 }
    );
  });

  it('should only report updates for relevant changes', async () => {
    const watch = powersync
      .query<{ make: string }>({
        sql: 'SELECT * FROM assets where make = ?',
        parameters: ['test']
      })
      .watch({
        comparator: new ArrayComparator({
          compareBy: (item) => JSON.stringify(item)
        })
      });

    let notificationCount = 0;
    const dispose = watch.registerListener({
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
      .query({
        sql: 'SELECT * FROM assets where make = ?',
        parameters: ['test']
      })
      .watch({
        reportFetching: false
      });

    expect(watch.state.isFetching).false;

    let notificationCount = 0;
    const dispose = watch.registerListener({
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
      .query<{ make: string }>({
        sql: 'SELECT * FROM assets where make = ?',
        parameters: ['test']
      })
      .watch({
        reportFetching: false
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
      query: new GetAllQuery<{ make: string }>({
        sql: 'SELECT * FROM assets where make = ?',
        parameters: ['nottest']
      })
    });

    expect(watch.state.isLoading).false;
    expect(watch.state.isFetching).true;

    await vi.waitFor(
      () => {
        expect(watch.state.isFetching).false;
      },
      { timeout: 1000 }
    );

    expect(watch.state.data).toHaveLength(1);
    expect(watch.state.data[0].make).equals('nottest');
  });

  it('should allow updating queries', async () => {
    const watch = powersync
      .query<{ make: string }>({
        sql: 'SELECT ? as result',
        parameters: [0]
      })
      .watch({
        reportFetching: false
      });

    let states: WatchedQueryState<any>[] = [];

    // Keep track of all the states which have been updated
    const dispose = watch.registerListener({
      onStateChange: (state) => {
        states.push(state);
      }
    });

    // Spam the updateSettings
    let updatePromises = Array.from({ length: 100 }).map(async (_, index) =>
      watch.updateSettings({
        query: new GetAllQuery({
          sql: 'SELECT ? as result',
          parameters: [index + 1]
        })
      })
    );

    await Promise.all(updatePromises);

    await vi.waitFor(
      () => {
        console.log(JSON.stringify(states));
        expect(states[states.length - 1].isFetching).false;
        expect(states[states.length - 1].data[0].result).eq(100);
      },
      { timeout: 3000 }
    );
    dispose();
  });

  it('should report differential query results', async () => {
    const watch = powersync
      .query({
        sql: /* sql */ `
          SELECT
            *
          FROM
            assets
        `,
        mapper: (raw) => {
          return {
            id: raw.id as string,
            make: raw.make as string
          };
        }
      })
      .differentialWatch();

    const diffs: WatchedQueryDifferential<{ id: string; make: string }>[] = [];

    watch.registerListener({
      onDiff: (diff) => {
        diffs.push(diff);
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
        expect(diffs[0].added[0]?.make).equals('test1');
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
        expect(diffs).toHaveLength(2);
        // This should now reflect that we had one change since the last event
        expect(diffs[1].added).toHaveLength(1);
        expect(diffs[1].added[0]?.make).equals('test2');

        expect(diffs[1].removed).toHaveLength(0);
        expect(diffs[1].all).toHaveLength(2);
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
        expect(diffs).toHaveLength(3);
        expect(diffs[2].added).toHaveLength(0);
        expect(diffs[2].all).toHaveLength(1);
        expect(diffs[2].unchanged).toHaveLength(1);
        expect(diffs[2].unchanged[0]?.make).equals('test1');

        expect(diffs[2].removed).toHaveLength(1);
        expect(diffs[2].removed[0]?.make).equals('test2');
      },
      { timeout: 1000 }
    );
  });

  it('should report differential query results with a custom comparator', async () => {
    const watch = powersync
      .query({
        sql: /* sql */ `
          SELECT
            *
          FROM
            assets
        `,
        mapper: (raw) => {
          return {
            id: raw.id as string,
            make: raw.make as string
          };
        }
      })
      .differentialWatch({
        rowComparator: {
          keyBy: (item) => item.id,
          compareBy: (item) => JSON.stringify(item)
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

    const diffs: WatchedQueryDifferential<{ id: string; make: string }>[] = [];

    watch.registerListener({
      onDiff: (diff) => {
        diffs.push(diff);
      }
    });

    await vi.waitFor(
      () => {
        expect(diffs).toHaveLength(1);
        expect(diffs[0].added[0]?.make).equals('test1');
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
        expect(diffs).toHaveLength(2);
        // This should now reflect that we had one change since the last event
        expect(diffs[1].added).toHaveLength(1);
        expect(diffs[1].added[0]?.make).equals('test2');

        expect(diffs[1].removed).toHaveLength(0);
        expect(diffs[1].all).toHaveLength(2);
      },
      { timeout: 1000 }
    );
  });

  it('should preserve object references in result set', async () => {
    // Sort the results by the `make` column in ascending order
    const watch = powersync
      .query({
        sql: /* sql */ `
          SELECT
            *
          FROM
            assets
          ORDER BY
            make ASC;
        `,
        mapper: (raw) => {
          return {
            id: raw.id as string,
            make: raw.make as string
          };
        }
      })
      .differentialWatch({
        rowComparator: {
          keyBy: (item) => item.id,
          compareBy: (item) => JSON.stringify(item)
        }
      });

    // Create sample data
    await powersync.execute(
      /* sql */ `
        INSERT INTO
          assets (id, make, customer_id)
        VALUES
          (uuid (), ?, uuid ()),
          (uuid (), ?, uuid ()),
          (uuid (), ?, uuid ())
      `,
      ['a', 'b', 'd']
    );

    await vi.waitFor(
      () => {
        expect(watch.state.data.map((i) => i.make)).deep.equals(['a', 'b', 'd']);
      },
      { timeout: 1000 }
    );

    const initialData = watch.state.data;

    await powersync.execute(
      /* sql */ `
        INSERT INTO
          assets (id, make, customer_id)
        VALUES
          (uuid (), ?, uuid ())
      `,
      ['c']
    );

    await vi.waitFor(
      () => {
        expect(watch.state.data).toHaveLength(4);
      },
      { timeout: 1000 }
    );

    console.log(JSON.stringify(watch.state.data));
    expect(initialData[0] == watch.state.data[0]).true;
    expect(initialData[1] == watch.state.data[1]).true;
    // The index after the insert should also still be the same ref as the previous item
    expect(initialData[2] == watch.state.data[3]).true;
  });

  it('should report differential query results from initial state', async () => {
    /**
     * Differential queries start with a placeholder data. We run a watched query under the hood
     * which triggers initially and for each change to underlying tables.
     * Changes are calculated based on the initial state and the current state.
     * The default empty differential state will result in the initial watch query reporting
     * all results as added.
     * We can perform relative differential queries by providing a placeholder data
     * which is the initial state of the query.
     */

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

    const watch = powersync
      .query({
        sql: /* sql */ `
          SELECT
            *
          FROM
            assets
        `,
        mapper: (raw) => {
          return {
            id: raw.id as string,
            make: raw.make as string
          };
        }
      })
      .differentialWatch({
        placeholderData:
          // Fetch the initial state as a baseline before creating the watch.
          // Any changes after this state will be reported as changes.
          await powersync.getAll(`SELECT * FROM assets`)
      });

    // It should have the initial value
    expect(watch.state.data).toHaveLength(1);

    const diffs: WatchedQueryDifferential<{ id: string; make: string }>[] = [];

    watch.registerListener({
      onDiff: (diff) => {
        diffs.push(diff);
      }
    });

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
        expect(diffs).toHaveLength(1);
        // This should now reflect that we had one change since the last event
        expect(diffs[0].added).toHaveLength(1);
        expect(diffs[0].added[0]?.make).equals('test2');

        expect(diffs[0].removed).toHaveLength(0);
        expect(diffs[0].all).toHaveLength(2);
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
        expect(diffs).toHaveLength(2);
        expect(diffs[1].added).toHaveLength(0);
        expect(diffs[1].all).toHaveLength(1);
        expect(diffs[1].unchanged).toHaveLength(1);
        expect(diffs[1].unchanged[0]?.make).equals('test1');

        expect(diffs[1].removed).toHaveLength(1);
        expect(diffs[1].removed[0]?.make).equals('test2');
      },
      { timeout: 1000 }
    );
  });

  it('should report differential query results changed rows', async () => {
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

    const watch = powersync
      .query({
        sql: /* sql */ `
          SELECT
            *
          FROM
            assets
        `,
        mapper: (raw) => {
          return {
            id: raw.id as string,
            make: raw.make as string
          };
        }
      })
      .differentialWatch();

    await vi.waitFor(
      () => {
        // Wait for the data to be loaded
        expect(watch.state.data[0]?.make).equals('test1');
      },
      { timeout: 1000, interval: 100 }
    );

    const diffs: WatchedQueryDifferential<{ id: string; make: string }>[] = [];

    watch.registerListener({
      onDiff: (diff) => {
        diffs.push(diff);
      }
    });

    await powersync.execute(
      /* sql */ `
        UPDATE assets
        SET
          make = ?
        WHERE
          make = ?
      `,
      ['test2', 'test1']
    );

    await vi.waitFor(
      () => {
        expect(diffs).toHaveLength(1);
        expect(diffs[0].added).toHaveLength(0);
        const updated = diffs[0].updated[0];

        // The update should contain previous and current values of changed rows
        expect(updated).toBeDefined();
        expect(updated.previous.make).equals('test1');
        expect(updated.current.make).equals('test2');

        expect(diffs[0].removed).toHaveLength(0);
        expect(diffs[0].all).toHaveLength(1);
      },
      { timeout: 1000 }
    );
  });
});
