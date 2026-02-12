import { cleanup, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, vi } from 'vitest';
import React, { act, useSyncExternalStore } from 'react';
import { AbstractPowerSyncDatabase, ConnectionManager, SyncStatus } from '@powersync/common';
import { openPowerSync } from './utils';
import { PowerSyncContext } from '../src/hooks/PowerSyncContext';
import { useSyncStream, UseSyncStreamOptions } from '../src/hooks/streams';
import { useQuery } from '../src/hooks/watched/useQuery';
import { QuerySyncStreamOptions } from '../src/hooks/watched/watch-types';

describe('stream hooks', () => {
  let db: AbstractPowerSyncDatabase;

  beforeEach(() => {
    db = openPowerSync();
    vi.clearAllMocks();
    cleanup(); // Cleanup the DOM after each test
  });

  function currentStreams() {
    const connections = (db as any).connectionManager as ConnectionManager;
    return connections.activeStreams;
  }

  const baseWrapper = ({ children }) => <PowerSyncContext.Provider value={db}>{children}</PowerSyncContext.Provider>;

  const testCases = [
    {
      mode: 'normal',
      wrapper: baseWrapper
    },
    {
      mode: 'StrictMode',
      wrapper: ({ children }) => <React.StrictMode>{baseWrapper({ children, db })}</React.StrictMode>
    }
  ];

  testCases.forEach(({ mode, wrapper: testWrapper }) => {
    describe(`in ${mode}`, () => {
      it('useSyncStream', async () => {
        expect(currentStreams()).toStrictEqual([]);

        const { result, unmount } = renderHook(() => useSyncStream({ name: 'a' }), {
          wrapper: testWrapper
        });
        expect(result.current).toBeNull();
        await waitFor(() => expect(result.current).not.toBeNull(), { timeout: 1000, interval: 100 });
        expect(currentStreams()).toStrictEqual([{ name: 'a', params: null }]);

        // Should drop subscription on unmount
        unmount();
        expect(currentStreams()).toStrictEqual([]);
      });

      it('useSyncStream with cached instance', async () => {
        const existingSubscription = await db.syncStream('a').subscribe();
        await existingSubscription.unsubscribe();
        // The stream is still active at this point due to the TTL.

        // This means that useSyncStream should have a result available on the first render.
        const { result } = renderHook(() => useSyncStream({ name: 'a' }), {
          wrapper: testWrapper
        });
        expect(result.current).not.toBeNull();
      });

      it('useQuery can take syncStream instance', async () => {
        const { result } = renderHook(() => useQuery('SELECT 1', [], { streams: [db.syncStream('a')] }), {
          wrapper: testWrapper
        });

        // Not resolving the subscription.
        await waitFor(() => expect(result.current.data).toHaveLength(1), { timeout: 1000, interval: 100 });
      });

      it('useQuery waiting on stream', async () => {
        const { result } = renderHook(
          () => useQuery('SELECT 1', [], { streams: [{ name: 'a', waitForStream: true }] }),
          {
            wrapper: testWrapper
          }
        );
        expect(result.current).toMatchObject({ isLoading: true });
        // Including the stream should subscribe.
        await waitFor(() => expect(currentStreams()).toHaveLength(1), { timeout: 1000, interval: 100 });
        expect(result.current).toMatchObject({ isLoading: true });

        // Set last_synced_at for the subscription
        db.currentStatus = _testStatus;
        db.iterateListeners((l) => l.statusChanged?.(_testStatus));

        // Which should eventually run the query.
        await waitFor(() => expect(result.current.data).toHaveLength(1), { timeout: 1000, interval: 100 });
      });

      it('useQuery not waiting on stream', async () => {
        // By default, it should still run the query immediately instead of waiting for the stream to resolve.
        const { result } = renderHook(() => useQuery('SELECT 1', [], { streams: [{ name: 'a' }] }), {
          wrapper: testWrapper
        });

        // Not resolving the subscription.
        await waitFor(() => expect(result.current.data).toHaveLength(1), { timeout: 1000, interval: 100 });
      });

      it('unsubscribes on unmount', async () => {
        const { unmount } = renderHook(() => useQuery('SELECT 1', [], { streams: [{ name: 'a' }, { name: 'b' }] }), {
          wrapper: testWrapper
        });
        await waitFor(() => expect(currentStreams()).toHaveLength(2), { timeout: 1000, interval: 100 });

        unmount();
        await waitFor(() => expect(currentStreams()).toHaveLength(0), { timeout: 1000, interval: 100 });
      });

      it('handles stream parameter changes', async () => {
        // Start without streams
        let streams: QuerySyncStreamOptions[] = [];
        let streamUpdateListeners: (() => void)[] = [];

        const { result } = renderHook(
          () => {
            const updatingStreams = useSyncExternalStore(
              (cb) => {
                streamUpdateListeners.push(cb);
                return () => {
                  const index = streamUpdateListeners.indexOf(cb);
                  if (index != -1) {
                    streamUpdateListeners.splice(index, 1);
                  }
                };
              },
              () => streams
            );

            return useQuery('SELECT 1', [], { streams: updatingStreams });
          },
          {
            wrapper: testWrapper
          }
        );

        await waitFor(() => expect(result.current.data).toHaveLength(1), { timeout: 1000, interval: 100 });

        // Adopt streams - this should reset back to loading
        streams = [{ name: 'a', waitForStream: true }];
        act(() => streamUpdateListeners.forEach((cb) => cb()));
        expect(result.current).toMatchObject({ isLoading: true });

        // ... and subscribe
        await waitFor(() => expect(currentStreams()).toHaveLength(1), { timeout: 1000, interval: 100 });
        expect(result.current).toMatchObject({ isLoading: true });

        // update back to no streams
        streams = [];
        act(() => streamUpdateListeners.forEach((cb) => cb()));
        await waitFor(() => expect(currentStreams()).toHaveLength(0), { timeout: 1000, interval: 100 });
      });
    });
  });
});

const _testStatus = new SyncStatus({
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
