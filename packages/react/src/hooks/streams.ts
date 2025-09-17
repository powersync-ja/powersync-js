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
  parameters?: Record<string, any>;
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
  const { name, parameters } = options;
  const db = usePowerSync();
  const status = useStatus();
  const [subscription, setSubscription] = useState<SyncStreamSubscription | null>(null);

  useEffect(() => {
    let active = true;
    let subscription: SyncStreamSubscription | null = null;

    db.syncStream(name, parameters)
      .subscribe(options)
      .then((sub) => {
        if (active) {
          subscription = sub;
          setSubscription(sub);
        } else {
          sub.unsubscribe();
        }
      });

    return () => {
      active = false;
      subscription?.unsubscribe();
    };
  }, [name, parameters]);

  return subscription && status.forStream(subscription);
}

/**
 * @internal
 */
export function useAllSyncStreamsHaveSynced(
  db: AbstractPowerSyncDatabase,
  streams: UseSyncStreamOptions[] | undefined
): boolean {
  // Since streams are a user-supplied array, they will likely be different each time this function is called. We don't
  // want to update underlying subscriptions each time, though.
  const hash = useMemo(() => streams && JSON.stringify(streams), [streams]);
  const [synced, setHasSynced] = useState(streams == null || streams.length == 0);

  useEffect(() => {
    if (streams) {
      setHasSynced(false);

      const promises: Promise<SyncStreamSubscription>[] = [];
      const abort = new AbortController();
      for (const stream of streams) {
        promises.push(db.syncStream(stream.name, stream.parameters).subscribe(stream));
      }

      // First, wait for all subscribe() calls to make all subscriptions active.
      Promise.all(promises).then(async (streams) => {
        function allHaveSynced(status: SyncStatus) {
          return streams.every((s) => status.forStream(s)?.subscription?.hasSynced);
        }

        // Wait for the effect to be cancelled or all streams having synced.
        await db.waitForStatus(allHaveSynced, abort.signal);
        if (abort.signal.aborted) {
          // Was cancelled
        } else {
          // Has synced, update public state.
          setHasSynced(true);

          // Wait for cancellation before clearing subscriptions.
          await new Promise<void>((resolve) => {
            abort.signal.addEventListener('abort', () => resolve());
          });
        }

        // Effect was definitely cancelled at this point, so drop the subscriptions.
        for (const stream of streams) {
          stream.unsubscribe();
        }
      });

      return () => abort.abort();
    } else {
      // There are no streams, so all of them have synced.
      setHasSynced(true);
      return undefined;
    }
  }, [hash]);

  return synced;
}
