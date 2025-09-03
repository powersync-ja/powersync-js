import * as commonSdk from '@powersync/common';
import { toCompilableQuery, wrapPowerSyncWithDrizzle } from '@powersync/drizzle-driver';
import { PowerSyncDatabase } from '@powersync/web';
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { eq } from 'drizzle-orm';
import { sqliteTable, text } from 'drizzle-orm/sqlite-core';
import pDefer from 'p-defer';
import React, { useEffect } from 'react';
import { beforeEach, describe, expect, it, onTestFinished, vi } from 'vitest';
import { PowerSyncContext } from '../src/hooks/PowerSyncContext';
import { useQuery } from '../src/hooks/watched/useQuery';
import { useWatchedQuerySubscription } from '../src/hooks/watched/useWatchedQuerySubscription';

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
    await db.disconnectAndClear();
    await db.close();
  });

  return db;
};

describe('useQuery', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    cleanup(); // Cleanup the DOM after each test
  });

  const baseWrapper = ({ children, db }) => (
    <PowerSyncContext.Provider value={db}>{children}</PowerSyncContext.Provider>
  );

  const testCases = [
    {
      mode: 'normal',
      wrapper: baseWrapper
    },
    {
      mode: 'StrictMode',
      wrapper: ({ children, db }) => <React.StrictMode>{baseWrapper({ children, db })}</React.StrictMode>
    }
  ];

  testCases.forEach(({ mode, wrapper: testWrapper }) => {
    const isStrictMode = mode === 'StrictMode';

    describe(`in ${mode}`, () => {
      it('should set isLoading to true on initial load', async () => {
        const db = openPowerSync();
        const { result } = renderHook(() => useQuery('SELECT * from lists'), {
          wrapper: ({ children }) => testWrapper({ children, db })
        });
        const currentResult = result.current;
        expect(currentResult.isLoading).toEqual(true);
      });

      it('should set error when error occurs and runQueryOnce flag is set', async () => {
        const db = openPowerSync();

        const { result } = renderHook(() => useQuery('SELECT * from faketable', [], { runQueryOnce: true }), {
          wrapper: ({ children }) => testWrapper({ children, db })
        });

        await waitFor(
          async () => {
            expect(result.current.error?.message).equal('no such table: faketable');
          },
          { timeout: 500, interval: 100 }
        );
      });

      it('should set error when error occurs with watched query', async () => {
        const db = openPowerSync();

        const { result } = renderHook(() => useQuery('SELECT * from faketable', []), {
          wrapper: ({ children }) => testWrapper({ children, db })
        });

        await waitFor(
          async () => {
            expect(result.current.error?.message).equals('no such table: faketable');
          },
          { timeout: 500, interval: 100 }
        );
      });

      it('should rerun the query when refresh is used', async () => {
        const db = openPowerSync();
        const getAllSpy = vi.spyOn(db, 'getAll');

        const { result } = renderHook(() => useQuery('SELECT * from lists', [], { runQueryOnce: true }), {
          wrapper: ({ children }) => testWrapper({ children, db })
        });

        expect(result.current.isLoading).toEqual(true);

        let refresh;

        await waitFor(
          () => {
            const currentResult = result.current;
            refresh = currentResult.refresh;
            expect(currentResult.isLoading).toEqual(false);
            expect(getAllSpy).toHaveBeenCalledTimes(isStrictMode ? 2 : 1);
          },
          { timeout: 500, interval: 100 }
        );

        await act(() => refresh());

        expect(getAllSpy).toHaveBeenCalledTimes(isStrictMode ? 3 : 2);
      });

      it('should accept compilable queries', async () => {
        const db = openPowerSync();

        const { result } = renderHook(
          () => useQuery({ execute: () => [] as any, compile: () => ({ sql: 'SELECT * from lists', parameters: [] }) }),
          { wrapper: ({ children }) => testWrapper({ children, db }) }
        );
        const currentResult = result.current;
        expect(currentResult.isLoading).toEqual(true);
      });

      it('should react to updated queries (simple update)', async () => {
        const db = openPowerSync();

        let updateParameters = (params: string[]): void => {};
        const newParametersPromise = new Promise<string[]>((resolve) => {
          updateParameters = resolve;
        });

        await db.execute(/* sql */ `
          INSERT INTO
            lists (id, name)
          VALUES
            (uuid (), 'first'),
            (uuid (), 'second')
        `);

        const query = () => {
          const [parameters, setParameters] = React.useState<string[]>(['first']);

          useEffect(() => {
            // allow updating the parameters externally
            newParametersPromise.then((params) => setParameters(params));
          }, []);

          return useQuery('SELECT * FROM lists WHERE name = ?', parameters);
        };

        const { result } = renderHook(query, { wrapper: ({ children }) => testWrapper({ children, db }) });

        // We should only receive the first list due to the WHERE clause
        await vi.waitFor(
          () => {
            expect(result.current.data[0]?.name).toEqual('first');
          },
          { timeout: 500, interval: 100 }
        );

        // Now update the parameter
        updateParameters(['second']);

        // We should now only receive the second list due to the WHERE clause and updated parameter
        await vi.waitFor(
          () => {
            expect(result.current.data[0]?.name).toEqual('second');
          },
          { timeout: 500, interval: 100 }
        );
      });

      it('should execute compatible queries', async () => {
        const db = openPowerSync();

        const query = () =>
          useQuery({
            execute: () => [{ test: 'custom' }] as any,
            compile: () => ({ sql: 'SELECT * from lists', parameters: [] })
          });
        const { result } = renderHook(query, { wrapper: ({ children }) => testWrapper({ children, db }) });

        await vi.waitFor(
          () => {
            expect(result.current.data[0]?.test).toEqual('custom');
          },
          { timeout: 500, interval: 100 }
        );
      });

      it('should react to updated queries (Explicit Drizzle DB)', async () => {
        const db = openPowerSync();

        const lists = sqliteTable('lists', {
          id: text('id'),
          name: text('name')
        });

        const drizzleDb = wrapPowerSyncWithDrizzle(db, {
          schema: {
            lists
          }
        });

        let updateParameters = (params: string): void => {};
        const newParametersPromise = new Promise<string>((resolve) => {
          updateParameters = resolve;
        });

        await db.execute(/* sql */ `
          INSERT INTO
            lists (id, name)
          VALUES
            (uuid (), 'first'),
            (uuid (), 'second')
        `);

        const query = () => {
          const [name, setName] = React.useState<string>('first');
          const drizzleQuery = drizzleDb.select().from(lists).where(eq(lists.name, name));

          useEffect(() => {
            // allow updating the parameters externally
            newParametersPromise.then((params) => setName(params));
          }, []);

          return useQuery(toCompilableQuery(drizzleQuery));
        };

        const { result } = renderHook(query, { wrapper: ({ children }) => testWrapper({ children, db }) });

        // We should only receive the first list due to the WHERE clause
        await vi.waitFor(
          () => {
            expect(result.current.data[0]?.name).toEqual('first');
          },
          { timeout: 500, interval: 100 }
        );

        // Now update the parameter
        updateParameters('second');

        // We should now only receive the second list due to the WHERE clause and updated parameter
        await vi.waitFor(
          () => {
            expect(result.current.data[0]?.name).toEqual('second');
          },
          { timeout: 500, interval: 100 }
        );
      });

      it('should react to updated queries', async () => {
        const db = openPowerSync();

        let updateParameters = (params: string[]): void => {};
        const newParametersPromise = new Promise<string[]>((resolve) => {
          updateParameters = resolve;
        });

        await db.execute(/* sql */ `
          INSERT INTO
            lists (id, name)
          VALUES
            (uuid (), 'first'),
            (uuid (), 'second')
        `);

        const query = () => {
          const [parameters, setParameters] = React.useState<string[]>(['first']);

          useEffect(() => {
            // allow updating the parameters externally
            newParametersPromise.then((params) => setParameters(params));
          }, []);

          const query = React.useMemo(() => {
            return {
              execute: () => db.getAll<{ name: string }>('SELECT * FROM lists WHERE name = ?', parameters),
              compile: () => ({ sql: 'SELECT * FROM lists WHERE name = ?', parameters })
            };
          }, [parameters]);

          return useQuery(query);
        };

        const { result } = renderHook(query, { wrapper: ({ children }) => testWrapper({ children, db }) });

        // We should only receive the first list due to the WHERE clause
        await vi.waitFor(
          () => {
            expect(result.current.data[0]?.name).toEqual('first');
          },
          { timeout: 500, interval: 100 }
        );

        // Now update the parameter
        updateParameters(['second']);

        // We should now only receive the second list due to the WHERE clause and updated parameter
        await vi.waitFor(
          () => {
            expect(result.current.data[0]?.name).toEqual('second');
          },
          { timeout: 500, interval: 100 }
        );
      });

      it('should show an error if parsing the query results in an error', async () => {
        const db = openPowerSync();

        const { result } = renderHook(
          () =>
            useQuery({
              execute: () => [] as any,
              compile: () => {
                throw new Error('error');
              }
            }),
          { wrapper: ({ children }) => testWrapper({ children, db }) }
        );

        await waitFor(
          async () => {
            const currentResult = result.current;
            expect(currentResult.isLoading).toEqual(false);
            expect(currentResult.isFetching).toEqual(false);
            expect(currentResult.data).toEqual([]);
            expect(currentResult.error).toEqual(Error('error'));
          },
          { timeout: 500, interval: 100 }
        );
      });

      it('should use an existing WatchedQuery instance', async () => {
        const db = openPowerSync();

        // This query can be instantiated once and reused.
        // The query retains it's state and will not re-fetch the data unless the result changes.
        // This is useful for queries that are used in multiple components.
        const listsQuery = db
          .query<{ id: string; name: string }>({ sql: `SELECT * FROM lists`, parameters: [] })
          .differentialWatch();

        const { result } = renderHook(() => useWatchedQuerySubscription(listsQuery), {
          wrapper: ({ children }) => testWrapper({ children, db })
        });

        expect(result.current.isLoading).toEqual(true);

        await waitFor(
          async () => {
            const { current } = result;
            expect(current.isLoading).toEqual(false);
          },
          { timeout: 500, interval: 100 }
        );

        // This should trigger an update
        await db.execute('INSERT INTO lists(id, name) VALUES (uuid(), ?)', ['aname']);

        await waitFor(
          async () => {
            const { current } = result;
            expect(current.data.length).toEqual(1);
          },
          { timeout: 500, interval: 100 }
        );

        // now use the same query again, the result should be available immediately
        const { result: newResult } = renderHook(() => useWatchedQuerySubscription(listsQuery), {
          wrapper: ({ children }) => testWrapper({ children, db })
        });
        expect(newResult.current.isLoading).toEqual(false);
        expect(newResult.current.data.length).toEqual(1);
      });

      it('should be able to switch between single and watched query', async () => {
        const db = openPowerSync();

        let changeRunOnce: React.Dispatch<React.SetStateAction<boolean>>;
        const { result } = renderHook(
          () => {
            const [runOnce, setRunOnce] = React.useState(true);
            changeRunOnce = setRunOnce;

            return useQuery('SELECT * FROM lists WHERE name = ?', ['aname'], { runQueryOnce: runOnce });
          },
          { wrapper: ({ children }) => testWrapper({ children, db }) }
        );

        // Wait for the query to run once.
        await waitFor(
          async () => {
            const { current } = result;
            expect(current.isLoading).toEqual(false);
          },
          { timeout: 500, interval: 100 }
        );

        // Then switch to watched queries.
        act(() => changeRunOnce(false));
        expect(result.current.isLoading).toBeTruthy();

        await waitFor(
          async () => {
            const { current } = result;
            expect(current.isLoading).toEqual(false);
          },
          { timeout: 500, interval: 100 }
        );

        // Because we're watching, this should trigger an update.
        await db.execute('INSERT INTO lists(id, name) VALUES (uuid(), ?)', ['aname']);
        await waitFor(
          async () => {
            const { current } = result;
            expect(current.data.length).toEqual(1);
          },
          { timeout: 500, interval: 100 }
        );
      });

      it('should emit result data when query changes', async () => {
        const db = openPowerSync();
        const { result } = renderHook(
          () =>
            useQuery('SELECT * FROM lists WHERE name = ?', ['aname'], {
              rowComparator: {
                keyBy: (item) => item.id,
                compareBy: (item) => JSON.stringify(item)
              }
            }),
          { wrapper: ({ children }) => testWrapper({ children, db }) }
        );

        expect(result.current.isLoading).toEqual(true);

        await waitFor(
          async () => {
            const { current } = result;
            expect(current.isLoading).toEqual(false);
          },
          { timeout: 500, interval: 100 }
        );

        // This should trigger an update
        await db.execute('INSERT INTO lists(id, name) VALUES (uuid(), ?)', ['aname']);

        await waitFor(
          async () => {
            const { current } = result;
            expect(current.data.length).toEqual(1);
          },
          { timeout: 500, interval: 100 }
        );

        const {
          current: { data }
        } = result;

        const deferred = pDefer();

        const baseGetAll = db.getAll;
        vi.spyOn(db, 'getAll').mockImplementation(async (sql, params) => {
          // Allow pausing this call in order to test isFetching
          await deferred.promise;
          return baseGetAll.call(db, sql, params);
        });

        // The number of calls should be incremented after we make a change
        await db.execute('INSERT INTO lists(id, name) VALUES (uuid(), ?)', ['anothername']);

        await waitFor(
          () => {
            expect(result.current.isFetching).toEqual(true);
          },
          { timeout: 500, interval: 100 }
        );

        // Allow the result to be returned
        deferred.resolve();

        // We should still read the data from the DB
        await waitFor(
          () => {
            expect(result.current.isFetching).toEqual(false);
          },
          { timeout: 500, interval: 100 }
        );

        // The data reference should be the same as the previous time
        expect(data == result.current.data).toEqual(true);
      });

      // Verifies backwards compatibility with the previous implementation (no comparison)
      it('should emit result data when data changes when not using rowComparator', async () => {
        const db = openPowerSync();
        const { result } = renderHook(() => useQuery('SELECT * FROM lists WHERE name = ?', ['aname']), {
          wrapper: ({ children }) => testWrapper({ children, db })
        });

        expect(result.current.isLoading).toEqual(true);

        await waitFor(
          async () => {
            const { current } = result;
            expect(current.isLoading).toEqual(false);
          },
          { timeout: 500, interval: 100 }
        );

        // This should trigger an update
        await db.execute('INSERT INTO lists(id, name) VALUES (uuid(), ?)', ['aname']);

        // Keep track of the previous data reference
        let previousData = result.current.data;
        await waitFor(
          async () => {
            const { current } = result;
            expect(current.data.length).toEqual(1);
            previousData = current.data;
          },
          { timeout: 500, interval: 100 }
        );

        // This should still trigger an update since the underlying tables changed.
        await db.execute('INSERT INTO lists(id, name) VALUES (uuid(), ?)', ['noname']);

        // It's difficult to assert no update happened, but we can wait a bit
        await new Promise((resolve) => setTimeout(resolve, 1000));

        // It should be the same data array reference, no update should have happened
        expect(result.current.data == previousData).false;
      });
    });
  });

  it('should error when PowerSync is not set', async () => {
    const { result } = renderHook(() => useQuery('SELECT * from lists'));
    const currentResult = result.current;
    expect(currentResult.error).toEqual(Error('PowerSync not configured.'));
    expect(currentResult.isLoading).toEqual(false);
    expect(currentResult.data).toEqual([]);
  });
});
