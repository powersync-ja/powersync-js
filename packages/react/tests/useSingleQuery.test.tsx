import { AbstractPowerSyncDatabase } from '@powersync/common';
import { act, cleanup, renderHook, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PowerSyncContext } from '../src/hooks/PowerSyncContext';
import { useSingleSuspenseQuery } from '../src/hooks/suspense/useSingleSuspenseQuery';
import { useQuery } from '../src/hooks/watched/useQuery';
import { openPowerSync } from './utils';

describe('single query refresh without an AbortSignal (Bug 4)', () => {
  let powersync: AbstractPowerSyncDatabase;

  beforeEach(() => {
    vi.clearAllMocks();
    cleanup();
    powersync = openPowerSync();
  });

  it('useQuery({ runQueryOnce: true }).refresh() called with no signal re-runs the query without erroring', async () => {
    await powersync.execute("INSERT INTO lists (id, name) VALUES (uuid(), 'list1')");

    const wrapper = ({ children }) => (
      <PowerSyncContext.Provider value={powersync}>{children}</PowerSyncContext.Provider>
    );

    const { result } = renderHook(() => useQuery('SELECT * from lists', [], { runQueryOnce: true }), {
      wrapper
    });

    await waitFor(
      () => {
        expect(result.current.isLoading).toBe(false);
      },
      { timeout: 1000 }
    );

    // The single-query path must expose refresh
    expect(result.current.refresh).toBeDefined();
    expect(result.current.error).toBeUndefined();

    // Calling refresh WITHOUT a signal must NOT put the hook into an error state.
    // On the unfixed code `signal.aborted` throws a TypeError that is caught by
    // runQuery's own try/catch and surfaced as `error`.
    await act(async () => {
      await result.current.refresh!();
    });

    expect(result.current.error).toBeUndefined();
    expect(result.current.data.length).toBe(1);
  });

  it('useSingleSuspenseQuery().refresh() called with no signal re-runs the query without erroring', async () => {
    const loadingFallback = 'Loading';
    const errorFallback = 'Error';
    await powersync.execute("INSERT INTO lists (id, name) VALUES (uuid(), 'list1')");

    const wrapper = ({ children }) => (
      <PowerSyncContext.Provider value={powersync}>
        <ErrorBoundary fallback={errorFallback}>
          <React.Suspense fallback={loadingFallback}>{children}</React.Suspense>
        </ErrorBoundary>
      </PowerSyncContext.Provider>
    );

    const { result } = renderHook(
      () => useSingleSuspenseQuery('SELECT * from lists', [], { runQueryOnce: true }),
      { wrapper }
    );

    await waitFor(
      () => {
        expect(screen.queryByText(loadingFallback)).toBeFalsy();
        expect(result.current?.refresh).toBeDefined();
      },
      { timeout: 1000 }
    );

    // Calling refresh WITHOUT a signal must NOT throw the error to the ErrorBoundary.
    // On the unfixed code `signal.aborted` throws a TypeError caught by refresh's
    // try/catch and surfaced via setError -> thrown to the ErrorBoundary.
    await act(async () => {
      await result.current!.refresh();
    });

    expect(screen.queryByText(errorFallback)).toBeFalsy();
    expect(result.current!.data.length).toBe(1);
  });
});
