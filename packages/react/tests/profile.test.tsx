import * as commonSdk from '@powersync/common';
import { PowerSyncDatabase } from '@powersync/web';
import { Chart } from 'chart.js/auto';
import React, { Profiler } from 'react';
import ReactDOM from 'react-dom/client';
import { beforeEach, describe, it, Mock, onTestFinished, vi } from 'vitest';
import { PowerSyncContext } from '../src/hooks/PowerSyncContext';
import { useQuery } from '../src/hooks/watched/useQuery';
import { useWatchedQuerySubscription } from '../src/hooks/watched/useWatchedQuerySubscription';

let skipTests = true;
/**
 * This does not run as part of all tests. Enable this suite manually to run performance tests.
 *
 * The tests here compare the time taken to render a list of items under different watched query modes.
 * The Tests render a list of Items supplied from a Watched Query.
 *
 * Methodology:
 * In all tests we start with an initial set of items then add a new item.
 * The render time for the list widget is measured for each insert.
 *
 * Each watched query mode is tested with and without memoization of the components.
 *
 * The standard watch query mode returns new object references for each change. This means that the
 * entire widget will render each time a new item is added - even if memoization is used.
 *
 * The differential watch mode will return previous object references for unchanged items. This can reduce the render time,
 * but only if memoization is used. The time taken to process the differential changes is also measured, to make a fair comparison,
 * the differential processing time is added to the render time for each insert.
 *
 * Initial data set volume is sweeped over a range of values. A memoized differential watch query should only render new items on insert.
 * It is expected that render times will increase for regular watch queries as the initial data set volume increases.
 */
const AppSchema = new commonSdk.Schema({
  lists: new commonSdk.Table({
    name: commonSdk.column.text,
    description: commonSdk.column.text,
    items: commonSdk.column.integer
  })
});

type List = (typeof AppSchema)['types']['lists'];

export const openPowerSync = () => {
  const db = new PowerSyncDatabase({
    database: { dbFilename: 'test.db' },
    schema: AppSchema
  });

  onTestFinished(async () => {
    await db.disconnectAndClear();
    await db.close();
  });

  return db;
};

const TestWidget: React.FC<{
  getData: () => ReadonlyArray<List>;
  memoize: boolean;
}> = (props) => {
  const data = props.getData();
  return (
    <div>
      {props.memoize
        ? data.map((item) => <TestItemMemoized key={item.id} item={item} />)
        : data.map((item) => <TestItemWidget key={item.id} item={item} />)}
    </div>
  );
};

const TestItemWidget: React.FC<{ item: List }> = (props) => {
  const { item } = props;
  return (
    <div key={item.id}>
      <div>{item.id}</div>
      <div>{item.name}</div>
      <div>{item.description}</div>
      <div>{item.items}</div>
    </div>
  );
};

const TestItemMemoized = React.memo(TestItemWidget);

type InsertTestResult = {
  initialRenderDuration: number;
  renderDurations: number[];
  averageAdditionalRenderDuration: number;
};

/**
 * Runs a single insert test for an amount of initial data and then inserts a number of items
 * and measures the render time for each insert.
 * Uses the data hook provided for rendering.
 */
const testInserts = async (options: {
  db: commonSdk.AbstractPowerSyncDatabase;
  getQueryData: () => ReadonlyArray<List>;
  useMemoize: boolean;
  initialDataCount: number;
  incrementalInsertsCount: number;
}): Promise<InsertTestResult> => {
  const { db, getQueryData, useMemoize, initialDataCount, incrementalInsertsCount } = options;

  const result: InsertTestResult = {
    initialRenderDuration: 0,
    renderDurations: [],
    averageAdditionalRenderDuration: 0
  };

  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = ReactDOM.createRoot(container);
  let cleanupCompleted = false;
  const cleanup = () => {
    if (cleanupCompleted) return;
    root.unmount();
    document.body.removeChild(container);
    cleanupCompleted = true;
  };
  onTestFinished(() => {
    cleanup();
  });

  /**
   * The ordering of items by their numerically increasing name can cause items to be rendered in a different order
   * React does not seem to efficiently handle rows being added in the middle of the list.
   * This test tests if new items are sorted.
   * We pad the name for correct sorting.
   */
  const padWidth = Math.ceil((initialDataCount + incrementalInsertsCount) / 10);
  const padName = (number: number) => number.toString().padStart(padWidth, '0');

  const onRender: Mock<React.ProfilerOnRenderCallback> = vi.fn(() => {});
  const getDataSpy = vi.fn(getQueryData);
  const { benchmarkId } = await db.get<{ benchmarkId: string }>('select uuid() as benchmarkId');

  root.render(
    <Profiler id={benchmarkId} onRender={onRender}>
      <PowerSyncContext.Provider value={db}>
        <TestWidget memoize={useMemoize} getData={getDataSpy} />
      </PowerSyncContext.Provider>
    </Profiler>
  );

  // Create initial data
  await db.writeTransaction(async (tx) => {
    for (let i = 0; i < initialDataCount; i++) {
      await tx.execute(/* sql */ `
        INSERT INTO
          lists (id, name, description)
        VALUES
          (
            uuid (),
            '${padName(i)}',
            hex (randomblob (30))
          )
      `);
    }
  });

  // The initial data should have been rendered after this returns correctly
  await vi.waitFor(
    () => {
      expect(getDataSpy.mock.results.find((r) => r.value.length === initialDataCount)).toBeDefined();
    },
    { timeout: 100, interval: 10 }
  );

  // Get the last render time for update
  const getLastUpdateProfile = () => [...onRender.mock.calls].reverse().find((call) => call[1] == 'update');
  const initialRenderProfile = getLastUpdateProfile();
  const initialRenderDuration = initialRenderProfile?.[2];

  result.initialRenderDuration = initialRenderDuration ?? 0;

  const count = onRender.mock.calls.length;
  for (let renderTestCount = 0; renderTestCount < incrementalInsertsCount; renderTestCount++) {
    // Create a single item
    await db.execute(/* sql */ `
      INSERT INTO
        lists (id, name, description)
      VALUES
        (
          uuid (),
          '${padName(initialDataCount + renderTestCount)}',
          hex (randomblob (30))
        )
    `);

    // Wait for this change to be reflected in the UI
    await vi.waitFor(
      () => {
        expect(getDataSpy.mock.results.find((r) => r.value.length == initialDataCount + renderTestCount)).toBeDefined();
        expect(onRender.mock.calls.length).toBe(count + 1 + renderTestCount);
      },
      {
        timeout: 1000,
        interval: 10
      }
    );
    const profile = getLastUpdateProfile();
    const duration = profile?.[2];
    if (duration != null) {
      result.renderDurations.push(duration);
    } else {
      throw `No duration found for render ${renderTestCount + 1}`;
    }
  }

  cleanup();

  result.averageAdditionalRenderDuration =
    result.renderDurations.reduce((sum, duration) => sum + duration, 0) / result.renderDurations.length;
  return result;
};

type DifferentialInsertTestResult = InsertTestResult & {
  /**
   * Represents the duration of the render, not including the differential processing.
   * We add the differential processing time to the render time for comparison.s
   */
  pureRenderDurations: number[];
};

type TestsInsertsCompareResult = {
  regular: InsertTestResult;
  regularMemoized: InsertTestResult;
  differential: DifferentialInsertTestResult;
  differentialMemoized: DifferentialInsertTestResult;
};

const testsInsertsCompare = async (options: {
  db: commonSdk.AbstractPowerSyncDatabase;
  initialDataCount: number;
  incrementalInsertsCount: number;
}) => {
  const { db, incrementalInsertsCount, initialDataCount } = options;
  const result: Partial<TestsInsertsCompareResult> = {};
  // Testing Regular Queries Without Memoization
  result.regular = await testInserts({
    db,
    incrementalInsertsCount,
    initialDataCount,
    useMemoize: false,
    getQueryData: () => {
      const { data } = useQuery<List>('SELECT * FROM lists ORDER BY name ASC;', [], {
        reportFetching: false
      });
      return data;
    }
  });

  // Testing Regular Queries Without Memoization
  await db.execute('DELETE FROM lists;');
  result.regularMemoized = await testInserts({
    db,
    incrementalInsertsCount,
    initialDataCount,
    useMemoize: true,
    getQueryData: () => {
      const { data } = useQuery<List>('SELECT * FROM lists ORDER BY name ASC;', [], {
        reportFetching: false
      });
      return data;
    }
  });

  // Testing Differential Updates

  const diffSpy = (query: commonSdk.WatchedQuery, outputTimes: number[]) => {
    const base = (query as any).differentiate;
    vi.spyOn(query as any, 'differentiate').mockImplementation((...params: any[]) => {
      const start = performance.now();
      const result = base.apply(query, params);
      const time = performance.now() - start;
      outputTimes.push(time);
      return result;
    });
  };

  const notMemoizedDifferentialTest = async () => {
    await db.execute('DELETE FROM lists;');

    const query = db
      .query<List>({
        sql: 'SELECT * FROM lists ORDER BY name ASC;'
      })
      .differentialWatch({
        reportFetching: false
      });

    const times: number[] = [];
    diffSpy(query, times);

    const baseResult = await testInserts({
      db,
      incrementalInsertsCount,
      initialDataCount,
      useMemoize: false,
      getQueryData: () => {
        const { data } = useWatchedQuerySubscription(query);
        return [...data];
      }
    });

    const renderDurations = baseResult.renderDurations.map((d, i) => d + (times[i] ?? 0));
    const averageAdditionalRenderDuration =
      renderDurations.reduce((sum, duration) => sum + duration, 0) / renderDurations.length;
    result.differential = {
      ...baseResult,
      pureRenderDurations: baseResult.renderDurations,
      renderDurations,
      averageAdditionalRenderDuration
    };

    await query.close();
  };
  await notMemoizedDifferentialTest();

  // Testing Differential With Memoization
  await db.execute('DELETE FROM lists;');

  const query = db.query<List>({ sql: 'SELECT * FROM lists ORDER BY name ASC;' }).differentialWatch({
    reportFetching: false
  });

  const times: number[] = [];
  diffSpy(query, times);

  const baseResult = await testInserts({
    db,
    incrementalInsertsCount,
    initialDataCount,
    useMemoize: true,
    getQueryData: () => {
      const { data } = useWatchedQuerySubscription(query);
      return [...data];
    }
  });

  const renderDurations = baseResult.renderDurations.map((d, i) => d + (times[i] ?? 0));
  const averageAdditionalRenderDuration =
    renderDurations.reduce((sum, duration) => sum + duration, 0) / renderDurations.length;
  result.differentialMemoized = {
    ...baseResult,
    pureRenderDurations: baseResult.renderDurations,
    renderDurations,
    averageAdditionalRenderDuration
  };

  await query.close();

  await db.execute('DELETE FROM lists;');

  return result as TestsInsertsCompareResult;
};

describe.skipIf(skipTests)('Performance', { timeout: Infinity }, () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('Benchmark', async () => {
    const db = openPowerSync();
    // const initialDataCount = 10;
    const initialDataVolumeSteps = new Array(10).fill(0).map((_, i) => (i + 1) * 10);
    const incrementalInsertsCount = 10;
    const redoTestCount = 5;

    const totalResults: any[] = [];

    for (const initialDataCount of initialDataVolumeSteps) {
      const results: TestsInsertsCompareResult[] = [];
      for (let i = 0; i < redoTestCount; i++) {
        console.log(`Running test for initial data count: ${initialDataCount}, iteration: ${i + 1} / ${redoTestCount}`);
        // Run the test for the current initial data count
        const result = await testsInsertsCompare({
          db,
          initialDataCount,
          incrementalInsertsCount
        });
        results.push(result);
      }

      // Average the individual averages over each iteration
      const averageResult = {
        initialDataCount,
        regular:
          results.reduce((acc, r) => {
            return acc + r.regular.averageAdditionalRenderDuration;
          }, 0) / redoTestCount,
        regularMemoized:
          results.reduce((acc, r) => {
            return acc + r.regularMemoized.averageAdditionalRenderDuration;
          }, 0) / redoTestCount,
        differential:
          results.reduce((acc, r) => {
            return acc + r.differential.averageAdditionalRenderDuration;
          }, 0) / redoTestCount,
        differentialMemoized:
          results.reduce((acc, r) => {
            return acc + r.differentialMemoized.averageAdditionalRenderDuration;
          }, 0) / redoTestCount,
        differentialMemoImprovementPercentage: 0
      };

      averageResult.differentialMemoImprovementPercentage =
        ((averageResult.regular - averageResult.differentialMemoized) / averageResult.regular) * 100;

      totalResults.push(averageResult);
    }

    // Unfortunately vitest browser mode does not support console.table
    // This can be viewed if in the browser console.
    console.table(totalResults);

    // CSV log
    console.log(Object.keys(totalResults[0]).join(','));
    totalResults.forEach((r) => {
      console.log(Object.values(r).join(','));
    });

    // Make a nice chart, these are visible when running tests with a visible browser `headless: false`
    const chartCanvas = document.createElement('canvas');
    document.body.appendChild(chartCanvas);

    // Chart the Average incremental render times
    const testTypes = new Set(Object.keys(totalResults[0]));
    // Don't show this on this chart
    testTypes.delete('differentialMemoImprovementPercentage');
    testTypes.delete('initialDataCount');
    new Chart(chartCanvas, {
      type: 'line',
      data: {
        labels: initialDataVolumeSteps,
        datasets: Array.from(testTypes).map((resultType) => {
          return {
            label: resultType,
            data: totalResults.map((r) => r[resultType])
          };
        })
      },
      options: {
        scales: {
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: 'Average incremental render time (ms)'
            }
          },
          x: {
            title: {
              display: true,
              text: 'Initial count of items'
            }
          }
        }
      }
    });

    const percentCanvas = document.createElement('canvas');
    document.body.appendChild(percentCanvas);

    // Chart the Average incremental render times
    new Chart(percentCanvas, {
      type: 'line',
      data: {
        labels: initialDataVolumeSteps,
        datasets: [
          {
            label: 'Percentage decrease of render time for Differential Memoized',
            data: totalResults.map((r) => r.differentialMemoImprovementPercentage)
          }
        ]
      },
      options: {
        scales: {
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: 'Average incremental render time (ms)'
            }
          },
          x: {
            title: {
              display: true,
              text: 'Initial count of items'
            }
          }
        }
      }
    });
  });
});
