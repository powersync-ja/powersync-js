import { cleanup, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import React, { Suspense } from 'react';
import { AbstractPowerSyncDatabase } from '@powersync/common';
import { PowerSyncContext } from '@powersync/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { openPowerSync } from './utils';
import { useQuery } from '../src/hooks/useQuery';
import { useQueries } from '../src/hooks/useQueries';
import { useSuspenseQuery } from '../src/hooks/useQuery';

describe('user enabled option is respected', () => {
  let db: AbstractPowerSyncDatabase;
  let queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false
      }
    }
  });

  beforeEach(() => {
    db = openPowerSync();
    queryClient.clear();
    vi.clearAllMocks();
    cleanup();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <PowerSyncContext.Provider value={db}>{children}</PowerSyncContext.Provider>
    </QueryClientProvider>
  );

  it('useQuery: does not run when user passes enabled: false (no streams)', async () => {
    const getAllSpy = vi.spyOn(db, 'getAll');

    const { result } = renderHook(
      () =>
        useQuery({
          queryKey: ['lists'],
          query: 'SELECT * FROM lists',
          enabled: false
        }),
      { wrapper }
    );

    await new Promise((resolve) => setTimeout(resolve, 300));

    expect(result.current.status).toBe('pending');
    expect(result.current.fetchStatus).toBe('idle');
    expect(result.current.data).toBeUndefined();
    expect(getAllSpy).not.toHaveBeenCalledWith('SELECT * FROM lists', expect.anything());
  });

  it('useQueries: does not run an entry where user passes enabled: false (no streams)', async () => {
    const getAllSpy = vi.spyOn(db, 'getAll');

    const { result } = renderHook(
      () =>
        useQueries({
          queries: [{ queryKey: ['lists'], query: 'SELECT * FROM lists', enabled: false }]
        }),
      { wrapper }
    );

    await new Promise((resolve) => setTimeout(resolve, 300));

    expect(result.current[0].status).toBe('pending');
    expect(result.current[0].fetchStatus).toBe('idle');
    expect(result.current[0].data).toBeUndefined();
    expect(getAllSpy).not.toHaveBeenCalledWith('SELECT * FROM lists', expect.anything());
  });

  it('useSuspenseQuery: with an unsynced waitForStream stream does not error with skipToken and still resolves', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error');

    const suspenseWrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>
        <PowerSyncContext.Provider value={db}>
          <Suspense fallback={<div data-testid="fallback">loading</div>}>{children}</Suspense>
        </PowerSyncContext.Provider>
      </QueryClientProvider>
    );

    const { result } = renderHook(
      () =>
        useSuspenseQuery({
          queryKey: ['suspense-lists'],
          query: 'SELECT * FROM lists',
          streams: [{ name: 'a', waitForStream: true }]
        }),
      { wrapper: suspenseWrapper }
    );

    await waitFor(() => expect(result.current.data).toBeDefined(), { timeout: 1000, interval: 100 });

    expect(consoleErrorSpy).not.toHaveBeenCalledWith('skipToken is not allowed for useSuspenseQuery');
  });
});
