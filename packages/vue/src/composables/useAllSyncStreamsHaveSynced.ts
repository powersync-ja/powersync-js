import { AbstractPowerSyncDatabase, SyncStatus, SyncStreamSubscription } from '@powersync/common';
import { UseSyncStreamOptions } from './useSyncStream.js';
import { computed, MaybeRef, Ref, ref, toValue, watch } from 'vue';

/**
 * Additional options to control how `useQuery` behaves when subscribing to a stream.
 */
export interface QuerySyncStreamOptions extends UseSyncStreamOptions {
  /**
   * The name of the stream to subscribe to.
   */
  name: string;
  /**
   * When set to `true`, a `useQuery` hook will remain in a loading state as long as the stream is resolving or
   * downloading for the first time (in other words, until {@link SyncSubscriptionDescription.hasSynced} is true).
   */
  waitForStream?: boolean;
}

/**
 * @internal
 */
export const useAllSyncStreamsHaveSynced = (
  db: MaybeRef<AbstractPowerSyncDatabase>,
  streams: MaybeRef<QuerySyncStreamOptions[] | undefined>
): { synced: Ref<boolean | undefined> } => {
  // Compute hash to detect content changes (not just reference changes)
  const hash = computed(() => {
    const streamsValue = toValue(streams);
    return streamsValue && JSON.stringify(streamsValue);
  });

  // Initialize synced state
  const streamsValue = toValue(streams);
  const synced = ref(streamsValue == null || streamsValue.every((e) => e.waitForStream != true));

  watch(
    hash,
    (_currentHash, _oldHash, onCleanup) => {
      const streamsValue = toValue(streams);
      const dbValue = toValue(db);

      if (!dbValue) {
        return;
      }

      if (streamsValue) {
        synced.value = false;

        const promises: Promise<SyncStreamSubscription>[] = [];
        const abort = new AbortController();

        for (const stream of streamsValue) {
          promises.push(dbValue.syncStream(stream.name, stream.parameters).subscribe(stream));
        }

        // First, wait for all subscribe() calls to make all subscriptions active.
        Promise.all(promises).then(async (resolvedStreams) => {
          function allHaveSynced(status: SyncStatus) {
            return resolvedStreams.every((s, i) => {
              const request = streamsValue[i];
              return !request.waitForStream || status.forStream(s)?.subscription?.hasSynced;
            });
          }

          // Wait for the effect to be cancelled or all streams having synced.
          await dbValue.waitForStatus(allHaveSynced, abort.signal);

          if (abort.signal.aborted) {
            // Was cancelled
          } else {
            // Has synced, update public state.
            synced.value = true;

            // Wait for cancellation before clearing subscriptions.
            await new Promise<void>((resolve) => {
              abort.signal.addEventListener('abort', () => resolve());
            });
          }

          // Effect was definitely cancelled at this point, so drop the subscriptions.
          for (const stream of resolvedStreams) {
            stream.unsubscribe();
          }
        });

        // Cleanup: abort when dependencies change or component unmounts
        onCleanup(() => {
          abort.abort();
        });
      } else {
        // There are no streams, so all of them have synced.
        synced.value = true;
      }
    },
    { immediate: true }
  );

  return {
    synced
  };
};
