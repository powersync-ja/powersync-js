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
import { QueryResult } from '../src/hooks/watched/watch-types';

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

        type TestEvent = {
          parameters: string[];
          hookResults: QueryResult<any>;
        };

        const hookEvents: TestEvent[] = [];

        const query = () => {
          const [parameters, setParameters] = React.useState<string[]>(['first']);

          useEffect(() => {
            // allow updating the parameters externally
            newParametersPromise.then((params) => setParameters(params));
          }, []);

          const result = useQuery('SELECT * FROM lists WHERE name = ?', parameters);
          hookEvents.push({
            parameters,
            hookResults: result
          });
          return result;
        };

        const { result } = renderHook(query, { wrapper: ({ children }) => testWrapper({ children, db }) });

        // We should only receive the first list due to the WHERE clause
        await vi.waitFor(
          () => {
            expect(result.current.data[0]?.name).toEqual('first');
          },
          { timeout: 500, interval: 100 }
        );

        // Verify that the fetching status was correlated to the parameters
        const firstResultEvent = hookEvents.find((event) => event.hookResults.data.length == 1);
        expect(firstResultEvent).toBeDefined();
        // Fetching should be false as soon as the results were made available
        expect(firstResultEvent?.hookResults.isFetching).false;

        // Now update the parameter
        updateParameters(['second']);

        // We should now only receive the second list due to the WHERE clause and updated parameter
        await vi.waitFor(
          () => {
            expect(result.current.data[0]?.name).toEqual('second');
          },
          { timeout: 500, interval: 100 }
        );

        // finds the first result where the parameters have changed
        const secondFetchingEvent = hookEvents.find((event) => event.parameters[0] == 'second');
        expect(secondFetchingEvent).toBeDefined();
        // We should immediately report that we are fetching once we detect new params
        expect(secondFetchingEvent?.hookResults.isFetching).true;
      });

      it('should react to updated queries (many updates)', async () => {
        const db = openPowerSync();

        await db.execute(/* sql */ `
          INSERT INTO
            lists (id, name)
          VALUES
            (uuid (), 'first'),
            (uuid (), 'second')
        `);

        type TestEvent = {
          parameters: string[];
          hookResults: QueryResult<any>;
        };

        const hookEvents: TestEvent[] = [];

        const queryObserver = new commonSdk.BaseObserver();
        const baseQuery = 'SELECT * FROM lists WHERE name = ?';
        const query = () => {
          const [query, setQuery] = React.useState({
            sql: baseQuery,
            params: ['']
          });

          useEffect(() => {
            // allow updating the parameters externally
            queryObserver.registerListener({
              queryUpdated: (query) => setQuery(query)
            });
          }, []);

          const result = useQuery(query.sql, query.params);
          hookEvents.push({
            parameters: query.params,
            hookResults: result
          });
          return result;
        };

        const { result } = renderHook(query, { wrapper: ({ children }) => testWrapper({ children, db }) });
        // let the hook render once, and immediately update the query
        queryObserver.iterateListeners((l) =>
          l.queryUpdated?.({
            sql: baseQuery,
            params: ['first']
          })
        );

        // Wait for the first result to be emitted
        await vi.waitFor(
          () => {
            expect(result.current.data[0]?.name).toEqual('first');
            expect(result.current.isFetching).false;
            expect(result.current.isLoading).false;
          },
          { timeout: 500, interval: 100 }
        );

        // We changed the params before the initial query could execute (we changed the params immediately)
        // We should not see isLoading=false for the first set of params
        expect(
          hookEvents.find((event) => event.parameters[0] == '' && event.hookResults.isLoading == false)
        ).toBeUndefined();
        // We should have an event where this was both loading and fetching
        expect(
          hookEvents.find(
            (event) =>
              event.parameters[0] == 'first' &&
              event.hookResults.isLoading == true &&
              event.hookResults.isFetching == true
          )
        ).toBeDefined();
        // We should not have any event where isLoading or isFetching is false without data being presented
        expect(
          hookEvents.find(
            (event) =>
              event.parameters[0] == 'first' &&
              (event.hookResults.isLoading || event.hookResults.isFetching) == false &&
              event.hookResults.data[0]?.name != 'first'
          )
        ).toBeUndefined();

        // Verify that the fetching status was correlated to the parameters
        const firstResultEvent = hookEvents.find((event) => event.hookResults.data.length == 1);
        expect(firstResultEvent).toBeDefined();
        // Fetching should be false as soon as the results were made available
        expect(firstResultEvent?.hookResults.isFetching).false;

        // Now update the parameter with something which will cause an error
        queryObserver.iterateListeners((l) =>
          l.queryUpdated?.({
            sql: 'select this is a broken query',
            params: ['error']
          })
        );

        // wait for the error to have been found
        await vi.waitFor(
          () => {
            expect(result.current.error).not.equal(null);
            expect(result.current.isFetching).false;
          },
          { timeout: 500, interval: 100 }
        );

        // The error should not be present before isFetching is false
        expect(
          hookEvents.find((event) => event.hookResults.error != null && event.hookResults.isFetching == true)
        ).toBeUndefined();
        // there should not be any results where the fetching status is false, but the error is not presented
        expect(
          hookEvents.find(
            (event) =>
              event.parameters[0] == 'error' &&
              event.hookResults.error == null &&
              (event.hookResults.isFetching || event.hookResults.isLoading) == false
          )
        ).toBeUndefined();

        queryObserver.iterateListeners((l) =>
          l.queryUpdated?.({
            sql: baseQuery,
            params: ['second']
          })
        );

        // We should now only receive the second list due to the WHERE clause and updated parameter
        await vi.waitFor(
          () => {
            expect(result.current.data[0]?.name).toEqual('second');
            expect(result.current.error).null;
            expect(result.current.isFetching).false;
            expect(result.current.isLoading).false;
          },
          { timeout: 500, interval: 100 }
        );

        const secondFetchingEvent = hookEvents.find((event) => event.parameters[0] == 'second');
        expect(secondFetchingEvent).toBeDefined();
        // We should immediately report that we are fetching once we detect new params
        expect(secondFetchingEvent?.hookResults.isFetching).true;
        // We should never have reported that fetching was false before the results were present
        expect(
          hookEvents.find(
            (event) =>
              event.parameters[0] == 'second' &&
              event.hookResults.data[0]?.name != 'second' &&
              (event.hookResults.isFetching == false || event.hookResults.isLoading == false)
          )
        );
      });

      it('should react to updated queries (immediate updates)', async () => {
        const db = openPowerSync();

        await db.execute(/* sql */ `
          INSERT INTO
            lists (id, name)
          VALUES
            (uuid (), 'first'),
            (uuid (), 'second'),
            (uuid (), 'third')
        `);

        type TestEvent = {
          parameters: number[];
          hookResults: QueryResult<any>;
        };

        const hookEvents: TestEvent[] = [];

        const baseQuery = 'SELECT * FROM lists LIMIT ?';

        const query = () => {
          const [query, setQuery] = React.useState({
            sql: baseQuery,
            params: [1]
          });

          // Change the params after the first render
          useEffect(() => {
            setQuery({
              sql: baseQuery,
              params: [2]
            });
          }, []);

          const result = useQuery(query.sql, query.params);
          hookEvents.push({
            parameters: query.params,
            hookResults: result
          });
          return result;
        };

        const { result } = renderHook(query, { wrapper: ({ children }) => testWrapper({ children, db }) });
        // Wait for the first result to be emitted
        await vi.waitFor(
          () => {
            expect(result.current.data.length).toEqual(2);
            expect(result.current.isFetching).false;
            expect(result.current.isLoading).false;
          },
          { timeout: 500, interval: 100 }
        );

        console.log(JSON.stringify(hookEvents));

        // We changed the params before the initial query could execute (we changed the params immediately)
        // We should not see isLoading=false for the first set of params
        expect(
          hookEvents.find(
            (event) =>
              event.parameters[0] == 1 &&
              (event.hookResults.isLoading == false || event.hookResults.isFetching == false)
          )
        ).toBeUndefined();
        // We should have an event where this was both loading and fetching
        expect(
          hookEvents.find(
            (event) =>
              event.parameters[0] == 1 && event.hookResults.isLoading == true && event.hookResults.isFetching == true
          )
        ).toBeDefined();

        // We should not have any event where isLoading or isFetching is false without data being presented
        expect(
          hookEvents.find(
            (event) =>
              event.parameters[0] == 1 &&
              (event.hookResults.isLoading || event.hookResults.isFetching) == false &&
              event.hookResults.data.length != 1
          )
        ).toBeUndefined();

        expect(
          hookEvents.find(
            (event) =>
              event.parameters[0] == 2 &&
              (event.hookResults.isLoading || event.hookResults.isFetching) == false &&
              event.hookResults.data.length != 2
          )
        ).toBeUndefined();

        expect(
          hookEvents.find(
            (event) =>
              event.parameters[0] == 2 &&
              (event.hookResults.isLoading && event.hookResults.isFetching) == false &&
              event.hookResults.data.length == 2
          )
        ).toBeDefined();
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

      it('sohuld allow changing parameter array size', async () => {
        const db = openPowerSync();

        let currentQuery = { sql: 'SELECT ? AS a', params: ['foo'] };
        let listeners: (() => void)[] = [];

        const query = () => {
          const current = React.useSyncExternalStore(
            (onChange) => {
              listeners.push(onChange);
              return () => listeners.splice(listeners.indexOf(onChange), 1);
            },
            () => currentQuery
          );

          return useQuery(current.sql, current.params);
        };

        const { result } = renderHook(query, { wrapper: ({ children }) => testWrapper({ children, db }) });

        await vi.waitFor(
          () => {
            expect(result.current.data).toStrictEqual([{ a: 'foo' }]);
          },
          { timeout: 500, interval: 50 }
        );

        // Now update the parameter
        act(() => {
          currentQuery = { sql: 'SELECT ? AS a, ? AS b', params: ['foo', 'bar'] };
          for (const listener of listeners) {
            listener();
          }
        });

        await vi.waitFor(
          () => {
            expect(result.current.data).toStrictEqual([{ a: 'foo', b: 'bar' }]);
          },
          { timeout: 500, interval: 50 }
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

      it('should handle dependent query parameter changes with correct state transitions', async () => {
        const db = openPowerSync();

        await db.execute(/* sql */ `
          INSERT INTO
            lists (id, name)
          VALUES
            (uuid (), 'item1')
        `);

        // Track state transitions
        const stateTransitions: Array<{
          param: string | number;
          dataLength: number;
          isFetching: boolean;
          isLoading: boolean;
        }> = [];

        const testHook = () => {
          // First query that provides the parameter - starts with 0, then returns 1
          const { data: paramData } = useQuery('SELECT 1 as result;', []);
          const param = paramData?.[0]?.result ?? 0;

          // Second query that depends on the first query's result
          const { data, isFetching, isLoading } = useQuery('SELECT * FROM lists LIMIT ?', [param]);

          const currentState = {
            param: param,
            dataLength: data?.length || 0,
            isFetching: isFetching,
            isLoading: isLoading
          };

          stateTransitions.push(currentState);
          return currentState;
        };

        const { result } = renderHook(() => testHook(), {
          wrapper: ({ children }) => testWrapper({ children, db })
        });

        // Wait for final state
        await waitFor(
          () => {
            const { current } = result;
            expect(current.isLoading).toEqual(false);
            expect(current.isFetching).toEqual(false);
            expect(current.param).toEqual(1);
            expect(current.dataLength).toEqual(1);
          },
          { timeout: 500, interval: 100 }
        );

        // Find the index where param changes from 0 to 1
        let beforeParamChangeIndex = 0;
        for (const transition of stateTransitions) {
          if (transition.param === 1) {
            beforeParamChangeIndex = stateTransitions.indexOf(transition) - 1;
            break;
          }
        }

        const indexMultiplier = isStrictMode ? 2 : 1; // StrictMode causes 1 extra render per state
        const initialState = stateTransitions[beforeParamChangeIndex];
        expect(initialState).toBeDefined();
        expect(initialState?.param).toEqual(0);
        expect(initialState?.dataLength).toEqual(0);
        expect(initialState?.isFetching).toEqual(true);
        expect(initialState?.isLoading).toEqual(true);

        const paramChangedState = stateTransitions[beforeParamChangeIndex + 1 * indexMultiplier];
        expect(paramChangedState).toBeDefined();
        expect(paramChangedState?.param).toEqual(1);
        expect(paramChangedState?.dataLength).toEqual(0);
        expect(paramChangedState?.isFetching).toEqual(true);
        expect(paramChangedState?.isLoading).toEqual(true);

        const finalState = stateTransitions[beforeParamChangeIndex + 2 * indexMultiplier];
        expect(finalState).toBeDefined();
        expect(finalState.param).toEqual(1);
        expect(finalState.dataLength).toEqual(1);
        expect(finalState.isFetching).toEqual(false);
        expect(finalState.isLoading).toEqual(false);
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
