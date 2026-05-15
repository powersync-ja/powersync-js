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

  describe('Bug 2: first table-resolution race loses first-sync data', () => {
    it('reflects rows written while table resolution is still on the slow path', async () => {
      // The race: powerSync.resolveTables is async. usePowerSyncQueries seeds
      // tablesArr to [] and only fills it once resolveTables resolves. The
      // onChangeWithCallback effect registers a change listener with
      // { tables: tablesArr[idx] } === { tables: [] } on first render -> that
      // listener watches NO tables. Any write that lands BEFORE resolveTables
      // resolves is consumed by that []-listener and dropped; the listener that
      // later attaches with the real tables attaches AFTER the write, so it
      // never sees it. Without the rescue invalidation the query stays empty.
      //
      // Determinism:
      //  - We gate powerSync.resolveTables on a promise to widen the (already
      //    real, just very fast) async window so the write reliably lands in it.
      //  - The query observer uses staleTime: Infinity + refetchOnMount/Focus/
      //    Reconnect: false so the ONLY thing that can refresh the cached empty
      //    result is an explicit queryClient.invalidateQueries() from the change
      //    path under test (not a TanStack refetch heuristic).
      //  - We strip ONLY the `schemaChanged` listener from registerListener.
      //    PowerSync's own first-write bookkeeping fires `schemaChanged` in this
      //    wa-sqlite browser harness, and usePowerSyncQueries' separate
      //    schemaChanged listener would invalidate and accidentally rescue the
      //    query -- masking the bug with a harness artifact unrelated to the
      //    race. Removing it does NOT remove the bug (the bug is the missing
      //    [] -> [tables] rescue invalidation); it removes the artifact so the
      //    missing code is what determines pass/fail. Everything else (the real
      //    resolveTables, the real change listeners, the real DB, the real
      //    QueryClient) is untouched.
      //
      // We assert ONLY on the user-visible query data, never on a spy.
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

      // Referentially stable input so parsedQueries / effects do not re-run
      // spuriously across renders.
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

      // The query runs once and resolves to empty data (no rows yet).
      // resolveTables is gated, so the change listener is currently attached
      // watching NO tables.
      await waitFor(() => expect(result.current.data).toEqual([]), { timeout: 2000, interval: 50 });

      // Write a row WHILE table resolution is still pending (the race window).
      await db.execute('INSERT INTO lists (id, name) VALUES (uuid(), ?)', ['from-first-sync']);

      // Let the []-listener's throttled flush consume and drop the change
      // notification before the real-tables listener can attach.
      await new Promise((r) => setTimeout(r, 150));

      // Now let resolveTables resolve. The []-listener missed the write; the
      // new listener attaches AFTER it. Only the rescue invalidation on the
      // first [] -> [lists] transition can surface the row.
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
});
