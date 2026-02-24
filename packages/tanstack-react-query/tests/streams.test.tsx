import { cleanup, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, vi } from 'vitest';
import React, { act, useSyncExternalStore } from 'react';
import { AbstractPowerSyncDatabase, ConnectionManager, SyncStatus } from '@powersync/common';
import { openPowerSync } from './utils';
import { PowerSyncContext } from '@powersync/react';
import { useQuery } from '../src/hooks/useQuery';
import { useQueries } from '../src/hooks/useQueries';
import { QuerySyncStreamOptions } from '@powersync/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

describe('stream hooks', () => {
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
    cleanup(); // Cleanup the DOM after each test
  });

  function currentStreams() {
    const connections = (db as any).connectionManager as ConnectionManager;
    return connections.activeStreams;
  }

  const baseWrapper = ({ children }) => (
    <QueryClientProvider client={queryClient}>
      <PowerSyncContext.Provider value={db}>{children}</PowerSyncContext.Provider>
    </QueryClientProvider>
  );

  const testCases = [
    {
      mode: 'normal',
      wrapper: baseWrapper
    },
    {
      mode: 'StrictMode',
      wrapper: ({ children }) => <React.StrictMode>{baseWrapper({ children })}</React.StrictMode>
    }
  ];

  describe('useQuery', () => {
    testCases.forEach(({ mode, wrapper: testWrapper }) => {
      describe(`in ${mode}`, () => {
        it('can take syncStream instance', async () => {
          const { result } = renderHook(() => useQuery({ queryKey: ['test'], query: 'SELECT 1', streams: [db.syncStream('a')] }), {
            wrapper: testWrapper
          });

          // Not resolving the subscription.
          await waitFor(() => expect(result.current.data).toHaveLength(1), { timeout: 1000, interval: 100 });
        });

        it('waiting on stream', async () => {
          const getAllSpy = vi.spyOn(db, 'getAll');

          const { result } = renderHook(
            () => useQuery({ queryKey: ['test'], query: 'SELECT 1', streams: [{ name: 'a', waitForStream: true }] }),
            {
              wrapper: testWrapper
            }
          );

          expect(result.current).toMatchObject({ isPending: true });
          // Including the stream should subscribe.
          await waitFor(() => expect(currentStreams()).toHaveLength(1), { timeout: 1000, interval: 100 });
          expect(result.current).toMatchObject({ isPending: true });
          // The query executor should not have been called while waiting for the stream.
          // (getAll is also used internally for EXPLAIN/resolveTables, so check specifically for the user query)
          expect(getAllSpy).not.toHaveBeenCalledWith('SELECT 1', expect.anything());

          // Set last_synced_at for the subscription
          db.currentStatus = _testStatus;
          db.iterateListeners((l) => l.statusChanged?.(_testStatus));

          // Which should eventually run the query.
          await waitFor(() => expect(result.current.data).toHaveLength(1), { timeout: 1000, interval: 100 });
          expect(result.current).toMatchObject({ isPending: false });
          expect(getAllSpy).toHaveBeenCalledWith('SELECT 1', expect.anything());
        });

        it('not waiting on stream', async () => {
          // By default, it should still run the query immediately instead of waiting for the stream to resolve.
          const { result } = renderHook(() => useQuery({ queryKey: ['test'], query: 'SELECT 1', streams: [{ name: 'a' }] }), {
            wrapper: testWrapper
          });

          // Not resolving the subscription.
          await waitFor(() => expect(result.current.data).toHaveLength(1), { timeout: 1000, interval: 100 });
        });

        it('unsubscribes on unmount', async () => {
          const { unmount } = renderHook(() => useQuery({ queryKey: ['test'], query: 'SELECT 1', streams: [{ name: 'a' }, { name: 'b' }] }), {
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

              return useQuery({ queryKey: ['test', streams], query: 'SELECT 1', streams: updatingStreams });
            },
            {
              wrapper: testWrapper
            }
          );

          await waitFor(() => expect(result.current.data).toHaveLength(1), { timeout: 1000, interval: 100 });

          // Adopt streams - this should reset back to loading
          streams = [{ name: 'a', waitForStream: true }];
          act(() => streamUpdateListeners.forEach((cb) => cb()));
          console.log(1, result.current)
          expect(result.current).toMatchObject({ isFetching: true });
          expect(result.current).toMatchObject({ isPending: true });

          // ... and subscribe
          await waitFor(() => expect(currentStreams()).toHaveLength(1), { timeout: 1000, interval: 100 });

          // update back to no streams
          streams = [];
          act(() => streamUpdateListeners.forEach((cb) => cb()));
          await waitFor(() => expect(currentStreams()).toHaveLength(0), { timeout: 1000, interval: 100 });
        });
      });
    });
  });

  describe('useQueries', () => {
    testCases.forEach(({ mode, wrapper: testWrapper }) => {
      describe(`in ${mode}`, () => {
        it('can take syncStream instance', async () => {
          const { result } = renderHook(
            () =>
              useQueries({
                queries: [
                  { queryKey: ['test1'], query: 'SELECT 1', streams: [db.syncStream('a')] },
                  { queryKey: ['test2'], query: 'SELECT 2' }
                ]
              }),
            { wrapper: testWrapper }
          );

          await waitFor(
            () => {
              expect(result.current[0].data).toHaveLength(1);
              expect(result.current[1].data).toHaveLength(1);
            },
            { timeout: 1000, interval: 100 }
          );
        });

        it('waiting on stream blocks all queries', async () => {
          const getAllSpy = vi.spyOn(db, 'getAll');

          const { result } = renderHook(
            () =>
              useQueries({
                queries: [
                  { queryKey: ['test1'], query: 'SELECT 1', streams: [{ name: 'a', waitForStream: true }] },
                  { queryKey: ['test2'], query: 'SELECT 2' }
                ]
              }),
            { wrapper: testWrapper }
          );

          // Both queries should be pending since streams haven't synced
          expect(result.current[0]).toMatchObject({ isPending: true });
          expect(result.current[1]).toMatchObject({ isPending: true });

          // Including the stream should subscribe.
          await waitFor(() => expect(currentStreams()).toHaveLength(1), { timeout: 1000, interval: 100 });
          expect(result.current[0]).toMatchObject({ isPending: true });
          expect(result.current[1]).toMatchObject({ isPending: true });
          // Neither query executor should have been called while waiting for the stream.
          expect(getAllSpy).not.toHaveBeenCalledWith('SELECT 1', expect.anything());
          expect(getAllSpy).not.toHaveBeenCalledWith('SELECT 2', expect.anything());

          // Set last_synced_at for the subscription
          db.currentStatus = _testStatus;
          db.iterateListeners((l) => l.statusChanged?.(_testStatus));

          // Which should eventually run both queries.
          await waitFor(
            () => {
              expect(result.current[0].data).toHaveLength(1);
              expect(result.current[1].data).toHaveLength(1);
            },
            { timeout: 1000, interval: 100 }
          );
          expect(result.current[0]).toMatchObject({ isPending: false });
          expect(result.current[1]).toMatchObject({ isPending: false });
          expect(getAllSpy).toHaveBeenCalledWith('SELECT 1', expect.anything());
          expect(getAllSpy).toHaveBeenCalledWith('SELECT 2', expect.anything());
        });

        it('not waiting on stream', async () => {
          // Without waitForStream, queries should resolve immediately
          const { result } = renderHook(
            () =>
              useQueries({
                queries: [
                  { queryKey: ['test1'], query: 'SELECT 1', streams: [{ name: 'a' }] },
                  { queryKey: ['test2'], query: 'SELECT 2', streams: [{ name: 'b' }] }
                ]
              }),
            { wrapper: testWrapper }
          );

          await waitFor(
            () => {
              expect(result.current[0].data).toHaveLength(1);
              expect(result.current[1].data).toHaveLength(1);
            },
            { timeout: 1000, interval: 100 }
          );
        });

        it('unsubscribes on unmount', async () => {
          const { unmount } = renderHook(
            () =>
              useQueries({
                queries: [
                  { queryKey: ['test1'], query: 'SELECT 1', streams: [{ name: 'a' }] },
                  { queryKey: ['test2'], query: 'SELECT 2', streams: [{ name: 'b' }] }
                ]
              }),
            { wrapper: testWrapper }
          );

          // Streams from both queries should be subscribed
          await waitFor(() => expect(currentStreams()).toHaveLength(2), { timeout: 1000, interval: 100 });

          unmount();
          await waitFor(() => expect(currentStreams()).toHaveLength(0), { timeout: 1000, interval: 100 });
        });

        it('deduplicates shared streams across queries', async () => {
          const { unmount } = renderHook(
            () =>
              useQueries({
                queries: [
                  { queryKey: ['test1'], query: 'SELECT 1', streams: [{ name: 'a' }] },
                  { queryKey: ['test2'], query: 'SELECT 2', streams: [{ name: 'a' }] }
                ]
              }),
            { wrapper: testWrapper }
          );

          // Both queries reference stream 'a', but the connection manager should deduplicate
          await waitFor(() => expect(currentStreams()).toHaveLength(1), { timeout: 1000, interval: 100 });

          unmount();
          await waitFor(() => expect(currentStreams()).toHaveLength(0), { timeout: 1000, interval: 100 });
        });

        it('works with combine', async () => {
          const { result } = renderHook(
            () =>
              useQueries({
                queries: [
                  { queryKey: ['test1'], query: 'SELECT 1', streams: [{ name: 'a' }] },
                  { queryKey: ['test2'], query: 'SELECT 2' }
                ],
                combine: (results) => ({
                  allData: results.map((r) => r.data),
                  anyPending: results.some((r) => r.isPending)
                })
              }),
            { wrapper: testWrapper }
          );

          await waitFor(() => expect(result.current.anyPending).toBe(false), { timeout: 1000, interval: 100 });
          expect(result.current.allData).toHaveLength(2);
          expect(result.current.allData[0]).toHaveLength(1);
          expect(result.current.allData[1]).toHaveLength(1);
        });

        it('handles stream parameter changes', async () => {
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

              return useQueries({
                queries: [
                  { queryKey: ['test1', streams], query: 'SELECT 1', streams: updatingStreams },
                  { queryKey: ['test2'], query: 'SELECT 2' }
                ]
              });
            },
            { wrapper: testWrapper }
          );

          // Should resolve immediately with no streams
          await waitFor(
            () => {
              expect(result.current[0].data).toHaveLength(1);
              expect(result.current[1].data).toHaveLength(1);
            },
            { timeout: 1000, interval: 100 }
          );

          // Adopt streams with waitForStream - should block queries
          streams = [{ name: 'a', waitForStream: true }];
          act(() => streamUpdateListeners.forEach((cb) => cb()));
          expect(result.current[0]).toMatchObject({ isPending: true });

          // Should subscribe
          await waitFor(() => expect(currentStreams()).toHaveLength(1), { timeout: 1000, interval: 100 });

          // Remove streams again
          streams = [];
          act(() => streamUpdateListeners.forEach((cb) => cb()));
          await waitFor(() => expect(currentStreams()).toHaveLength(0), { timeout: 1000, interval: 100 });
        });
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
