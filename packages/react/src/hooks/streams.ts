import { useEffect, useMemo, useState } from 'react';
import { usePowerSync } from './PowerSyncContext.js';
import {
  AbstractPowerSyncDatabase,
  SyncStatus,
  SyncStreamStatus,
  SyncStreamSubscribeOptions,
  SyncStreamSubscription
} from '@powersync/common';
import { useStatus } from './useStatus.js';
import { QuerySyncStreamOptions } from './watched/watch-types.js';

/**
 * A sync stream to subscribe to in {@link useSyncStream}.
 *
 * For more details on sync streams, see the [documentation](https://docs.powersync.com/usage/sync-streams).
 */
export interface UseSyncStreamOptions extends SyncStreamSubscribeOptions {
  /**
   * The name of the stream to subscribe to.
   */
  name: string;
  /**
   * Parameters for the stream subscription. A single stream can have multiple subscriptions with different parameter
   * sets.
   */
  parameters?: Record<string, any> | null;
}

/**
 * Creates a PowerSync stream subscription. The subscription is kept alive as long as the React component calling this
 * function. When it unmounts, {@link SyncStreamSubscription.unsubscribe} is called
 *
 * For more details on sync streams, see the [documentation](https://docs.powersync.com/usage/sync-streams).
 *
 * @returns The status for that stream, or `null` if the stream is currently being resolved.
 */
export function useSyncStream(options: UseSyncStreamOptions): SyncStreamStatus | null {
  return useSyncStreams([options])[0];
}

/**
 * Creates multiple PowerSync stream subscriptions. Subscriptions are kept alive as long as the
 * React component calling this function. When it unmounts, or when the streams array contents
 * change, all previous subscriptions are unsubscribed before new ones are created.
 */
export function useSyncStreams(streamOptions: UseSyncStreamOptions[]): SyncStreamStatus[] {
  const db = usePowerSync();
  const status = useStatus();

  const stringifiedOptions = useMemo(() => JSON.stringify(streamOptions), [streamOptions]);
  const syncStreams = useMemo(
    () =>
      streamOptions.map((options) => {
        return {
          stream: db.syncStream(options.name, options.parameters ?? undefined),
          options
        };
      }),
    [stringifiedOptions]
  );

  useEffect(() => {
    let active = true;
    const resolvedSubs: SyncStreamSubscription[] = [];

    for (const entry of syncStreams) {
      entry.stream.subscribe(entry.options).then((sub) => {
        if (active) {
          resolvedSubs.push(sub);
        } else {
          // The cleanup function already ran, unsubscribe immediately.
          sub.unsubscribe();
        }
      });
    }

    return () => {
      active = false;
      for (const sub of resolvedSubs) {
        sub.unsubscribe();
      }
    };
  }, [stringifiedOptions]);

  return useMemo(
    () => syncStreams.map((entry) => status.forStream(entry.stream) ?? null),
    [status, stringifiedOptions]
  );
}

/**
 * Returns `true` once all streams in the array have synced at least once.
 */
export function useAllSyncStreamsHaveSynced(
  db: AbstractPowerSyncDatabase,
  streams: QuerySyncStreamOptions[] | undefined
): boolean {
  const statuses = useSyncStreams(streams ?? []);

  if (!streams) return true;

  return streams.every((stream, i) => {
    if (!stream.waitForStream) return true;
    return statuses[i]?.subscription?.hasSynced === true;
  });
}
