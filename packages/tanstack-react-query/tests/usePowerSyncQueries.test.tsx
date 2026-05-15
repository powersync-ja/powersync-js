import { cleanup, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import React from 'react';
import { AbstractPowerSyncDatabase, SyncStatus } from '@powersync/common';
import { PowerSyncContext } from '@powersync/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { openPowerSync } from './utils';
import { usePowerSyncQueries } from '../src/hooks/usePowerSyncQueries';

describe('usePowerSyncQueries bug fixes', () => {
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

  // Marks stream 'a' as having synced (last_synced_at set).
  const syncedStatus = () =>
    new SyncStatus({
      dataFlow: {
        internalStreamSubscriptions: [
          {
            name: 'a',
            parameters: null,
            progress: { total: 0, downloaded: 0 },
            active: true,
            is_default: false,
            has_explicit_subscription: true,
            expires_at: null,
            last_synced_at: 1234,
            priority: 1
          }
        ]
      }
    });

  describe('Bug 1: streamsHaveSynced in final useMemo deps', () => {
    it('updated returned streamsHaveSynced once a waitForStream stream syncs', async () => {
      // The query input is referentially stable across re-renders. This is the
      // realistic case (callers memoize their query config). It ensures the
      // final useMemo's listed deps (parsedQueries/errorsArr/tablesArr/powerSync)
      // do NOT change when only streamsHaveSynced flips, so the missing dep is
      // what determines whether the returned value updates.
      const stableQueries = [
        {
          query: 'SELECT name FROM lists',
          queryKey: ['bug1'],
          streams: [{ name: 'a', waitForStream: true }]
        }
      ];

      const { result, unmount } = renderHook(() => usePowerSyncQueries(stableQueries, queryClient), { wrapper });

      // Initially the stream has not synced, so streamsHaveSynced is false.
      await waitFor(() => expect(result.current.streamsHaveSynced).toBe(false), { timeout: 1000, interval: 50 });

      // The stream subscription synced (last_synced_at set). The underlying
      // useAllSyncStreamsHaveSynced hook now returns true; the returned value
      // must reflect that. With the missing useMemo dep it stays stale (false).
      db.currentStatus = syncedStatus();
      db.iterateListeners((l) => l.statusChanged?.(syncedStatus()));

      await waitFor(() => expect(result.current.streamsHaveSynced).toBe(true), { timeout: 1000, interval: 50 });

      // Let the in-flight resolveTables round-trip to the DB worker settle
      // before the shared openPowerSync() teardown closes the database.
      await waitFor(() => expect(result.current.queries[0].tables).toContain('lists'), {
        timeout: 1000,
        interval: 50
      });

      unmount();
    });
  });
});
