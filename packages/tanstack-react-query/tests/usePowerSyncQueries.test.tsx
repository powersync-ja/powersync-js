import { cleanup, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import React from 'react';
import { AbstractPowerSyncDatabase, SyncStatus } from '@powersync/common';
import { PowerSyncContext } from '@powersync/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { openPowerSync } from './utils';
import * as Tanstack from '@tanstack/react-query';
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

  describe('usePowerSyncQueries ', () => {
    it('updated returned streamsHaveSynced once a waitForStream stream syncs', async () => {
      const stableQueries = [
        {
          query: 'SELECT name FROM lists',
          queryKey: ['bug1'],
          streams: [{ name: 'a', waitForStream: true }]
        }
      ];

      const { result, unmount } = renderHook(() => usePowerSyncQueries(stableQueries, queryClient), { wrapper });

      await waitFor(() => expect(result.current.streamsHaveSynced).toBe(false), { timeout: 1000, interval: 50 });

      db.currentStatus = syncedStatus();
      db.iterateListeners((l) => l.statusChanged?.(syncedStatus()));

      await waitFor(() => expect(result.current.streamsHaveSynced).toBe(true), { timeout: 1000, interval: 50 });

      await waitFor(() => expect(result.current.queries[0].tables).toContain('lists'), {
        timeout: 1000,
        interval: 50
      });

      unmount();
    });
  });

  it('picks up rows written before the source tables finished resolving', async () => {
      let releaseResolve!: () => void;
      const resolveGate = new Promise<void>((resolve) => {
        releaseResolve = resolve;
      });

      const realResolveTables = db.resolveTables.bind(db);
      const resolveSpy = vi.spyOn(db, 'resolveTables').mockImplementation(async (sql, params) => {
        await resolveGate;
        return realResolveTables(sql, params);
      });

      const realRegisterListener = db.registerListener.bind(db);
      const registerListenerSpy = vi
        .spyOn(db, 'registerListener')
        .mockImplementation((listener: Parameters<typeof realRegisterListener>[0]) => {
          if (listener && (listener as { schemaChanged?: unknown }).schemaChanged) {
            const { schemaChanged: _omit, ...rest } = listener as Record<string, unknown>;
            return realRegisterListener(rest as Parameters<typeof realRegisterListener>[0]);
          }
          return realRegisterListener(listener);
        });

      const stableQueries = [{ query: 'SELECT name FROM lists ORDER BY name', queryKey: ['bug2'] }];

      const { result, unmount } = renderHook(
        () => {
          const { queries } = usePowerSyncQueries(stableQueries, queryClient);
          return Tanstack.useQuery(
            {
              queryKey: ['bug2'],
              queryFn: queries[0].queryFn as () => Promise<{ name: string }[]>,
              staleTime: Infinity,
              refetchOnMount: false,
              refetchOnWindowFocus: false,
              refetchOnReconnect: false
            },
            queryClient
          );
        },
        { wrapper }
      );

      await waitFor(() => expect(result.current.data).toEqual([]), { timeout: 2000, interval: 50 });

      await db.execute('INSERT INTO lists (id, name) VALUES (uuid(), ?)', ['from-first-sync']);

      await new Promise((r) => setTimeout(r, 150));

      releaseResolve();

      await waitFor(() => expect(result.current.data).toEqual([{ name: 'from-first-sync' }]), {
        timeout: 2000,
        interval: 50
      });

      resolveSpy.mockRestore();
      registerListenerSpy.mockRestore();
      unmount();
    });
});
