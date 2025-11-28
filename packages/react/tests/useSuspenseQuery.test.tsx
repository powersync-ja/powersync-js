import { AbstractPowerSyncDatabase, WatchedQuery, WatchedQueryListenerEvent } from '@powersync/common';
import { cleanup, renderHook, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PowerSyncContext } from '../src/hooks/PowerSyncContext';
import { useSuspenseQuery } from '../src/hooks/suspense/useSuspenseQuery';
import { useWatchedQuerySuspenseSubscription } from '../src/hooks/suspense/useWatchedQuerySuspenseSubscription';
import { openPowerSync } from './utils';

describe('useSuspenseQuery', () => {
  const loadingFallback = 'Loading';
  const errorFallback = 'Error';

  let powersync: AbstractPowerSyncDatabase;

  const wrapper = ({ children }) => (
    <PowerSyncContext.Provider value={powersync}>
      <ErrorBoundary fallback={errorFallback}>
        <React.Suspense fallback={loadingFallback}>{children}</React.Suspense>
      </ErrorBoundary>
    </PowerSyncContext.Provider>
  );

  const waitForSuspend = async () => {
    await waitFor(
      async () => {
        expect(screen.queryByText(loadingFallback)).toBeTruthy();
      },
      { timeout: 100 }
    );
  };

  const waitForCompletedSuspend = async () => {
    await waitFor(
      async () => {
        expect(screen.queryByText(loadingFallback)).toBeFalsy();
      },
      { timeout: 100 }
    );
  };

  const waitForError = async () => {
    await waitFor(
      async () => {
        expect(screen.queryByText(errorFallback)).toBeTruthy();
      },
      { timeout: 100 }
    );
  };

  beforeEach(() => {
    vi.clearAllMocks();
    cleanup(); // Cleanup the DOM after each test
    powersync = openPowerSync();
  });

  it('should error when PowerSync is not set', async () => {
    expect(() => {
      renderHook(() => useSuspenseQuery('SELECT * from lists'));
    }).toThrow('PowerSync not configured.');
  });

  it('should suspend on initial load', async () => {
    // spy on watched query generation
    const baseImplementation = powersync.customQuery;
    let watch: WatchedQuery<any> | null = null;

    const spy = vi.spyOn(powersync, 'customQuery').mockImplementation((options) => {
      const builder = baseImplementation.call(powersync, options);
      const baseBuild = builder.differentialWatch;

      // The hooks use the `watch` method if no comparator is set
      vi.spyOn(builder, 'watch').mockImplementation((buildOptions) => {
        watch = baseBuild.call(builder, buildOptions);
        return watch!;
      });

      return builder!;
    });

    const wrapper = ({ children }) => (
      <PowerSyncContext.Provider value={powersync}>
        <React.Suspense fallback={loadingFallback}>
          {children}
          <div>Not suspending</div>
        </React.Suspense>
      </PowerSyncContext.Provider>
    );

    await powersync.execute("INSERT INTO lists (id, name) VALUES (uuid(), 'aname')");

    const { unmount } = renderHook(() => useSuspenseQuery('SELECT * from lists'), { wrapper });

    expect(screen.queryByText('Not suspending')).toBeFalsy();
    await waitForSuspend();

    // The component should render after suspending
    await waitFor(
      async () => {
        expect(screen.queryByText('Not suspending')).toBeTruthy();
      },
      { timeout: 500, interval: 100 }
    );

    expect(watch).toBeDefined();
    expect(watch!.closed).false;
    expect(watch!.state.data.length).eq(1);
    expect(watch!.listenerMeta.counts[WatchedQueryListenerEvent.ON_STATE_CHANGE]).greaterThanOrEqual(2); // should have a temporary hold and state listener

    // wait for the temporary hold to elapse
    await waitFor(
      async () => {
        expect(watch!.listenerMeta.counts[WatchedQueryListenerEvent.ON_STATE_CHANGE]).eq(1);
      },
      { timeout: 10_000, interval: 500 }
    );

    // now unmount the hook, this should remove listeners from the watch and close the query
    unmount();

    // wait for the temporary hold to elapse
    await waitFor(
      async () => {
        expect(watch!.listenerMeta.counts[WatchedQueryListenerEvent.ON_STATE_CHANGE]).undefined;
        expect(watch?.closed).true;
      },
      { timeout: 10_000, interval: 500 }
    );
  });

  it('should run the query once if runQueryOnce flag is set', async () => {
    await powersync.execute("INSERT INTO lists (id, name) VALUES (uuid(), 'list1')");

    const { result } = renderHook(
      () => useSuspenseQuery<{ name: string }>('SELECT * from lists', [], { runQueryOnce: true }),
      {
        wrapper
      }
    );

    // Wait for the data to be presented
    let lastData;
    await waitFor(
      async () => {
        const currentResult = result.current;
        lastData = currentResult?.data;
        expect(lastData?.[0]).toBeDefined();
        expect(lastData?.[0].name).toBe('list1');
      },
      { timeout: 1000 }
    );

    await waitForCompletedSuspend();

    // Do another insert, this should not trigger a re-render
    await powersync.execute("INSERT INTO lists (id, name) VALUES (uuid(), 'list2')");

    // Wait a bit, it's difficult to test that something did not happen, so we just wait a bit
    await new Promise((r) => setTimeout(r, 1000));

    expect(result.current.data).toEqual(lastData);
    // sanity
    expect(result.current.data?.length).toBe(1);
  });

  it('should rerun the query when refresh is used', async () => {
    const { result } = renderHook(() => useSuspenseQuery('SELECT * from lists', [], { runQueryOnce: true }), {
      wrapper
    });

    // First ensure we do suspend, then wait for suspending to complete
    await waitForSuspend();

    let refresh;
    await waitFor(
      async () => {
        const currentResult = result.current;
        console.log(currentResult);
        refresh = currentResult?.refresh;
        expect(refresh).toBeDefined();
      },
      { timeout: 1000 }
    );

    await waitForCompletedSuspend();
    expect(refresh).toBeDefined();

    const spy = vi.spyOn(powersync, 'getAll');
    const callCount = spy.mock.calls.length;
    await refresh();
    expect(spy).toHaveBeenCalledTimes(callCount + 1);
  });

  it('should set error when error occurs', async () => {
    renderHook(() => useSuspenseQuery('SELECT * from fakelists', []), { wrapper });

    await waitForCompletedSuspend();
    await waitForError();
  });

  it('should set error when error occurs and runQueryOnce flag is set', async () => {
    renderHook(() => useSuspenseQuery('SELECT * from fakelists', [], { runQueryOnce: true }), {
      wrapper
    });

    await waitForCompletedSuspend();
    await waitForError();
  });

  it('should accept compilable queries', async () => {
    renderHook(
      () =>
        useSuspenseQuery({ execute: () => [] as any, compile: () => ({ sql: 'SELECT * from lists', parameters: [] }) }),
      { wrapper }
    );

    await waitForSuspend();
  });

  it('should execute compatible queries', async () => {
    const query = () =>
      useSuspenseQuery({
        execute: () => [{ test: 'custom' }] as any,
        compile: () => ({ sql: 'SELECT * from lists', parameters: [] })
      });
    const { result } = renderHook(query, { wrapper });

    await waitForSuspend();

    await waitForCompletedSuspend();
    await waitFor(
      async () => {
        expect(result.current?.data).toEqual([{ test: 'custom' }]);
      },
      { timeout: 100 }
    );
  });

  it('should show an error if parsing the query results in an error', async () => {
    const { result } = renderHook(
      () =>
        useSuspenseQuery({
          execute: () => [] as any,
          compile: () => {
            throw Error('error');
          }
        }),
      { wrapper }
    );

    await waitForCompletedSuspend();
    await waitForError();
  });

  it('should use an existing WatchedQuery instance', async () => {
    const db = openPowerSync();

    // This query can be instantiated once and reused.
    // The query retains it's state and will not re-fetch the data unless the result changes.
    // This is useful for queries that are used in multiple components.
    const listsQuery = db
      .query({
        sql: `SELECT * FROM lists`,
        parameters: []
      })
      .watch();

    const wrapper = ({ children }) => <PowerSyncContext.Provider value={db}>{children}</PowerSyncContext.Provider>;
    const { result } = renderHook(() => useWatchedQuerySuspenseSubscription(listsQuery), {
      wrapper
    });

    // Initially, the query should be loading/suspended
    expect(result.current).toEqual(null);

    await waitFor(
      async () => {
        expect(result.current).not.null;
      },
      { timeout: 500, interval: 100 }
    );

    expect(result.current.data.length).toEqual(0);

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
    const { result: newResult } = renderHook(() => useWatchedQuerySuspenseSubscription(listsQuery), { wrapper });
    expect(newResult.current).not.null;
    expect(newResult.current.data.length).toEqual(1);
  });

  it('should use an existing loaded WatchedQuery instance', async () => {
    const db = openPowerSync();

    const listsQuery = db
      .query({
        sql: `SELECT * FROM lists`,
        parameters: []
      })
      .watch();

    // Ensure the query has loaded before passing it to the hook.
    // This means we don't require a temporary hold
    await waitFor(
      () => {
        expect(listsQuery.state.isLoading).toBe(false);
      },
      { timeout: 1000 }
    );

    const wrapper = ({ children }) => (
      <React.StrictMode>
        <PowerSyncContext.Provider value={db}>{children}</PowerSyncContext.Provider>
      </React.StrictMode>
    );
    const { result } = renderHook(() => useWatchedQuerySuspenseSubscription(listsQuery), {
      wrapper
    });

    // Initially, the query should be loading/suspended
    expect(result.current).toBeDefined();
    expect(result.current.data.length).toEqual(0);
  });
});
