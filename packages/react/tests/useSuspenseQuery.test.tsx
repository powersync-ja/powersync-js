import { AbstractPowerSyncDatabase, WatchedQuery } from '@powersync/common';
import { cleanup, renderHook, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PowerSyncContext } from '../src/hooks/PowerSyncContext';
import { useSuspenseQuery } from '../src/hooks/useSuspenseQuery';
import { openPowerSync } from './useQuery.test';
const defaultQueryResult = ['list1', 'list2'];

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
    }).toThrow('PowerSync not configured');
  });

  it('should suspend on initial load', async () => {
    // spy on watched query generation
    const baseImplementation = powersync.incrementalWatch;
    let watch: WatchedQuery<Array<any>> | null = null;
    const spy = vi.spyOn(powersync, 'incrementalWatch').mockImplementation((options) => {
      watch = baseImplementation.call(powersync, options);
      return watch!;
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
    expect(watch!.subscriptionCounts.onStateChange).greaterThanOrEqual(2); // should have a temporary hold and state listener

    // wait for the temporary hold to elapse
    await waitFor(
      async () => {
        expect(watch!.subscriptionCounts.onStateChange).eq(1);
      },
      { timeout: 10_000, interval: 500 }
    );

    // now unmount the hook, this should remove listeners from the watch and close the query
    unmount();

    // wait for the temporary hold to elapse
    await waitFor(
      async () => {
        expect(watch!.subscriptionCounts.onStateChange).eq(0);
        expect(watch?.closed).true;
      },
      { timeout: 10_000, interval: 500 }
    );
  });

  // it('should run the query once if runQueryOnce flag is set', async () => {
  //   let resolvePromise: (_: string[]) => void = () => {};

  //   mockPowerSync.getAll = vi.fn(() => {
  //     return new Promise<string[]>((resolve) => {
  //       resolvePromise = resolve;
  //     });
  //   });

  //   const { result } = renderHook(() => useSuspenseQuery('SELECT * from lists', [], { runQueryOnce: true }), {
  //     wrapper
  //   });

  //   await waitForSuspend();

  //   resolvePromise(defaultQueryResult);

  //   await waitForCompletedSuspend();
  //   await waitFor(
  //     async () => {
  //       const currentResult = result.current;
  //       expect(currentResult?.data).toEqual(['list1', 'list2']);
  //       expect(mockPowerSync.onChangeWithCallback).not.toHaveBeenCalled();
  //       expect(mockPowerSync.getAll).toHaveBeenCalledTimes(1);
  //     },
  //     { timeout: 100 }
  //   );
  // });

  // it('should rerun the query when refresh is used', async () => {
  //   const { result } = renderHook(() => useSuspenseQuery('SELECT * from lists', [], { runQueryOnce: true }), {
  //     wrapper
  //   });

  //   await waitForSuspend();

  //   let refresh;

  //   await waitFor(
  //     async () => {
  //       const currentResult = result.current;
  //       refresh = currentResult.refresh;
  //       expect(mockPowerSync.getAll).toHaveBeenCalledTimes(1);
  //     },
  //     { timeout: 100 }
  //   );

  //   await waitForCompletedSuspend();

  //   await refresh();
  //   expect(mockPowerSync.getAll).toHaveBeenCalledTimes(2);
  // });

  it('should set error when error occurs', async () => {
    let rejectPromise: (err: string) => void = () => {};

    vi.spyOn(powersync, 'getAll').mockImplementation(() => {
      return new Promise<any>((_resolve, reject) => {
        rejectPromise = reject;
      });
    });

    renderHook(() => useSuspenseQuery('SELECT * from lists', []), { wrapper });

    await waitForSuspend();

    rejectPromise('failure');
    await waitForCompletedSuspend();
    await waitForError();
  });

  // it('should set error when error occurs and runQueryOnce flag is set', async () => {
  //   let rejectPromise: (err: string) => void = () => {};

  //   mockPowerSync.getAll = vi.fn(() => {
  //     return new Promise<void>((_resolve, reject) => {
  //       rejectPromise = reject;
  //     });
  //   });

  //   renderHook(() => useSuspenseQuery('SELECT * from lists', [], { runQueryOnce: true }), {
  //     wrapper
  //   });

  //   await waitForSuspend();

  //   rejectPromise('failure');
  //   await waitForCompletedSuspend();
  //   await waitForError();
  // });

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
});
