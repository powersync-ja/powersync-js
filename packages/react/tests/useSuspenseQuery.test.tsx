import { CommonPowerSyncDatabase, WatchedQuery } from '@powersync/common';
import { act, cleanup, renderHook, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PowerSyncContext } from '../src/hooks/PowerSyncContext';
import { TEMPORARY_HOLD_MS } from '../src/hooks/suspense/SuspenseQueryCache';
import { useSuspenseQuery } from '../src/hooks/suspense/useSuspenseQuery';
import { useWatchedQuerySuspenseSubscription } from '../src/hooks/suspense/useWatchedQuerySuspenseSubscription';
import { openPowerSync } from './utils';

describe('useSuspenseQuery', () => {
  const loadingFallback = 'Loading';
  const errorFallback = 'Error';

  let powersync: CommonPowerSyncDatabase;

  const wrapper = ({ children }: { children: React.ReactNode }) => (
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
      // Note: This wait time needs to exceed 300ms, as React waits that long for a commit.
      // https://github.com/react/react/blob/d083ec1da1e5252abd3ddfdde6dfbc09701a2c51/packages/react-reconciler/src/ReactFiberWorkLoop.js#L528
      { timeout: 500 }
    );
  };

  const waitForError = async () => {
    await waitFor(
      async () => {
        expect(screen.queryByText(errorFallback)).toBeTruthy();
      },
      { timeout: 500 }
    );
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    cleanup(); // Cleanup the DOM after each test
    powersync = await openPowerSync();
  });

  it('should error when PowerSync is not set', async () => {
    // don't log errors to console, since an error is expected
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

    // use a custom error wrapper that captures the content of the error
    const wrapper = ({ children }: { children: React.ReactNode }) => {
      return (
        <ErrorBoundary fallbackRender={({ error }) => <div data-testid="error-div">{error.message}</div>}>
          <React.Suspense fallback={loadingFallback}>{children}</React.Suspense>
        </ErrorBoundary>
      );
    };

    renderHook(() => useSuspenseQuery('SELECT * FROM lists'), { wrapper });

    await waitFor(
      () => {
        expect(screen.getByTestId('error-div').textContent).toBe('PowerSync not configured.');
      },
      { timeout: 100 }
    );

    // reinstate error logging
    spy.mockRestore();
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

    const wrapper = ({ children }: { children: React.ReactNode }) => (
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

    // The temporary hold placed while suspending expires, but the mounted component keeps the query alive.
    await new Promise((r) => setTimeout(r, TEMPORARY_HOLD_MS + 500));
    expect(watch!.closed).false;

    // Unmounting the hook removes the last subscriber, which closes the query.
    unmount();
    await waitFor(
      async () => {
        expect(watch!.closed).true;
      },
      { timeout: 1000, interval: 100 }
    );
  }, 15_000);

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

    let refresh: undefined | (() => Promise<void>);
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
    await refresh!();
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

  it.for([false, true])(`should switch to new parameters after mount (runQueryOnce: %j)`, async (runQueryOnce) => {
    await powersync.execute("INSERT INTO lists (id, name) VALUES (uuid(), 'a'), (uuid(), 'b')");

    const { result, rerender } = renderHook(
      ({ name }) =>
        useSuspenseQuery<{ name: string }>('SELECT name FROM lists WHERE name = ?', [name], { runQueryOnce }),
      { wrapper, initialProps: { name: 'a' } }
    );

    await waitFor(() => expect(result.current?.data).toEqual([{ name: 'a' }]), { timeout: 1000 });

    rerender({ name: 'b' });
    await waitFor(() => expect(result.current?.data).toEqual([{ name: 'b' }]), { timeout: 1000 });

    if (!runQueryOnce) {
      // The hook must be subscribed to the query for the new parameters.
      await powersync.execute("INSERT INTO lists (id, name) VALUES (uuid(), 'b')");
      await waitFor(() => expect(result.current?.data).toHaveLength(2), { timeout: 1000 });
    }
  });

  it('should share watched queries between hooks', async () => {
    const spy = vi.spyOn(powersync, 'customQuery');

    const { result } = renderHook(
      () => [useSuspenseQuery('SELECT * FROM lists'), useSuspenseQuery('SELECT * FROM lists')],
      { wrapper }
    );

    await waitFor(() => expect(result.current).toHaveLength(2), { timeout: 1000 });
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('should not suspend when refreshing', async () => {
    let fallbackRenders = 0;
    const Fallback = () => {
      fallbackRenders++;
      return loadingFallback;
    };
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <PowerSyncContext.Provider value={powersync}>
        <React.Suspense fallback={<Fallback />}>{children}</React.Suspense>
      </PowerSyncContext.Provider>
    );

    const { result } = renderHook(() => useSuspenseQuery('SELECT * FROM lists', [], { runQueryOnce: true }), {
      wrapper
    });
    await waitFor(() => expect(result.current?.refresh).toBeDefined(), { timeout: 1000 });
    await waitForCompletedSuspend();

    fallbackRenders = 0;
    await act(() => result.current.refresh!());
    expect(fallbackRenders).toBe(0);
    expect(screen.queryByText(loadingFallback)).toBeFalsy();
  });

  it('should resubscribe when given a different WatchedQuery', async () => {
    await powersync.execute("INSERT INTO lists (id, name) VALUES (uuid(), 'a'), (uuid(), 'b')");
    const queryFor = (name: string) =>
      powersync.query<{ name: string }>({ sql: 'SELECT name FROM lists WHERE name = ?', parameters: [name] }).watch();
    const queryA = queryFor('a');
    const queryB = queryFor('b');

    const { result, rerender } = renderHook(({ query }) => useWatchedQuerySuspenseSubscription(query), {
      wrapper,
      initialProps: { query: queryA }
    });
    await waitFor(() => expect(result.current?.data).toEqual([{ name: 'a' }]), { timeout: 1000 });

    rerender({ query: queryB });
    await waitFor(() => expect(result.current?.data).toEqual([{ name: 'b' }]), { timeout: 1000 });

    await powersync.execute("INSERT INTO lists (id, name) VALUES (uuid(), 'b')");
    await waitFor(() => expect(result.current?.data).toHaveLength(2), { timeout: 1000 });

    await queryA.close();
    await queryB.close();
  });

  it('should use an existing WatchedQuery instance', async () => {
    const db = await openPowerSync();

    // This query can be instantiated once and reused.
    // The query retains it's state and will not re-fetch the data unless the result changes.
    // This is useful for queries that are used in multiple components.
    const listsQuery = db
      .query({
        sql: `SELECT * FROM lists`,
        parameters: []
      })
      .watch();

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <PowerSyncContext.Provider value={db}>{children}</PowerSyncContext.Provider>
    );
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
    const db = await openPowerSync();

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

    const wrapper = ({ children }: { children: React.ReactNode }) => (
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

  it('reads current rows when another one-shot consumer mounts after a write', async () => {
    const useRowsOnce = () => useSuspenseQuery<{ name: string }>('SELECT name FROM lists', [], { runQueryOnce: true });
    const first = renderHook(useRowsOnce, { wrapper });

    await waitFor(() => expect(first.result.current?.data).toEqual([]));

    await act(async () => {
      await powersync.execute("INSERT INTO lists (id, name) VALUES ('new-list', 'new')");
      // The old implementation used a temporary watch during initial loading.
      // Give its throttled table-change notification time to observe this write
      // before mounting the second consumer. This is well inside the cache hold.
      await new Promise((resolve) => setTimeout(resolve, 250));
    });

    // A one-shot consumer that has already loaded should retain its own snapshot.
    expect(first.result.current.data).toEqual([]);

    const second = renderHook(useRowsOnce, { wrapper });
    await waitFor(() => expect(second.result.current?.data).toEqual([{ name: 'new' }]));
  });

  it('keeps another one-shot consumer unchanged when only the first is refreshed', async () => {
    const useRowsOnce = () => useSuspenseQuery<{ name: string }>('SELECT name FROM lists', [], { runQueryOnce: true });

    const first = renderHook(useRowsOnce, { wrapper });
    const second = renderHook(useRowsOnce, { wrapper });

    await waitFor(() => expect(first.result.current?.data).toEqual([]));
    await waitFor(() => expect(second.result.current?.data).toEqual([]));

    await act(async () => {
      await powersync.execute("INSERT INTO lists (id, name) VALUES ('new-list', 'new')");
    });
    expect(first.result.current.data).toEqual([]);
    expect(second.result.current.data).toEqual([]);

    await act(async () => {
      await first.result.current.refresh!();
    });

    // Prove the requested refresh worked before checking its unintended effect.
    expect(first.result.current.data).toEqual([{ name: 'new' }]);
    expect(second.result.current.data).toEqual([]);
  });
});
