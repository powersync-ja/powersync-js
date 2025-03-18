import * as commonSdk from '@powersync/common';
import { cleanup, renderHook, screen, waitFor } from '@testing-library/react';
import React, { Suspense } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { beforeEach, describe, expect, it, Mock, vi } from 'vitest';
import { PowerSyncContext } from '../src/hooks/PowerSyncContext';
import { useSuspenseQuery } from '../src/hooks/useSuspenseQuery';

const defaultQueryResult = ['list1', 'list2'];

const createMockPowerSync = () => {
  return {
    currentStatus: { status: 'initial' },
    registerListener: vi.fn(() => {}),
    resolveTables: vi.fn(() => ['table1', 'table2']),
    onChangeWithCallback: vi.fn(),
    getAll: vi.fn(() => Promise.resolve(defaultQueryResult)) as Mock<any, any>
  };
};

let mockPowerSync = createMockPowerSync();

vi.mock('./PowerSyncContext', () => ({
  useContext: vi.fn(() => mockPowerSync)
}));

describe('useSuspenseQuery', () => {
  const loadingFallback = 'Loading';
  const errorFallback = 'Error';

  const wrapper = ({ children }) => (
    <PowerSyncContext.Provider value={mockPowerSync as any}>
      <ErrorBoundary fallback={errorFallback}>
        <Suspense fallback={loadingFallback}>{children}</Suspense>
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
    mockPowerSync = createMockPowerSync();
  });

  it('should error when PowerSync is not set', async () => {
    expect(() => {
      renderHook(() => useSuspenseQuery('SELECT * from lists'));
    }).toThrow('PowerSync not configured');
  });

  it('should suspend on initial load', async () => {
    mockPowerSync.getAll = vi.fn(() => {
      return new Promise(() => {});
    });

    const wrapper = ({ children }) => (
      <PowerSyncContext.Provider value={mockPowerSync as any}>
        <Suspense fallback={loadingFallback}>{children}</Suspense>
      </PowerSyncContext.Provider>
    );

    renderHook(() => useSuspenseQuery('SELECT * from lists'), { wrapper });

    await waitForSuspend();

    expect(mockPowerSync.getAll).toHaveBeenCalledTimes(1);
  });

  it('should run the query once if runQueryOnce flag is set', async () => {
    let resolvePromise: (_: string[]) => void = () => {};

    mockPowerSync.getAll = vi.fn(() => {
      return new Promise<string[]>((resolve) => {
        resolvePromise = resolve;
      });
    });

    const { result } = renderHook(() => useSuspenseQuery('SELECT * from lists', [], { runQueryOnce: true }), {
      wrapper
    });

    await waitForSuspend();

    resolvePromise(defaultQueryResult);

    await waitForCompletedSuspend();
    await waitFor(
      async () => {
        const currentResult = result.current;
        expect(currentResult?.data).toEqual(['list1', 'list2']);
        expect(mockPowerSync.onChangeWithCallback).not.toHaveBeenCalled();
        expect(mockPowerSync.getAll).toHaveBeenCalledTimes(1);
      },
      { timeout: 100 }
    );
  });

  it('should rerun the query when refresh is used', async () => {
    const { result } = renderHook(() => useSuspenseQuery('SELECT * from lists', [], { runQueryOnce: true }), {
      wrapper
    });

    await waitForSuspend();

    let refresh;

    await waitFor(
      async () => {
        const currentResult = result.current;
        refresh = currentResult.refresh;
        expect(mockPowerSync.getAll).toHaveBeenCalledTimes(1);
      },
      { timeout: 100 }
    );

    await waitForCompletedSuspend();

    await refresh();
    expect(mockPowerSync.getAll).toHaveBeenCalledTimes(2);
  });

  it('should set error when error occurs', async () => {
    let rejectPromise: (err: string) => void = () => {};

    mockPowerSync.getAll = vi.fn(() => {
      return new Promise<void>((_resolve, reject) => {
        rejectPromise = reject;
      });
    });

    renderHook(() => useSuspenseQuery('SELECT * from lists', []), { wrapper });

    await waitForSuspend();

    rejectPromise('failure');
    await waitForCompletedSuspend();
    await waitForError();
  });

  it('should set error when error occurs and runQueryOnce flag is set', async () => {
    let rejectPromise: (err: string) => void = () => {};

    mockPowerSync.getAll = vi.fn(() => {
      return new Promise<void>((_resolve, reject) => {
        rejectPromise = reject;
      });
    });

    renderHook(() => useSuspenseQuery('SELECT * from lists', [], { runQueryOnce: true }), {
      wrapper
    });

    await waitForSuspend();

    rejectPromise('failure');
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
    vi.spyOn(commonSdk, 'parseQuery').mockImplementation(() => {
      throw new Error('error');
    });

    const { result } = renderHook(
      () =>
        useSuspenseQuery({
          execute: () => [] as any,
          compile: () => ({ sql: 'SELECT * from lists', parameters: ['param'] })
        }),
      { wrapper }
    );

    await waitForCompletedSuspend();
    await waitForError();
  });
});
