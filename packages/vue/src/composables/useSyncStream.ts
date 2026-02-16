import { SyncStreamStatus, SyncStreamSubscribeOptions, SyncStreamSubscription } from '@powersync/common';
import { computed, ComputedRef, MaybeRef, ref, toValue, watchEffect } from 'vue';
import { usePowerSync } from './powerSync.js';
import { useStatus } from './useStatus.js';

export interface UseSyncStreamOptions extends SyncStreamSubscribeOptions {
  /**
   * Parameters for the stream subscription. A single stream can have multiple subscriptions with different parameter
   * sets.
   */
  parameters?: Record<string, any> | null;
}

/**
 * Creates a PowerSync stream subscription. The subscription is kept alive as long as the Vue component calling this
 * function is mounted. When it unmounts, {@link SyncStreamSubscription.unsubscribe} is called
 *
 * For more details on sync streams, see the [documentation](https://docs.powersync.com/usage/sync-streams).
 *
 * @returns A computed reference to the status for that stream, or `null` if the stream is currently being resolved.
 */
export const useSyncStream = (
  name: MaybeRef<string>,
  options: MaybeRef<UseSyncStreamOptions>
): { status: ComputedRef<SyncStreamStatus | null> } => {
  const db = usePowerSync();
  const status = useStatus();

  if (!db || !db.value) {
    return { status: computed(() => null) };
  }

  const stream = computed(() => {
    const { parameters } = toValue(options);
    return db.value.syncStream(toValue(name), parameters);
  });

  watchEffect((onCleanup) => {
    const { parameters, ...subscribeOptions } = toValue(options);
    let subscription: SyncStreamSubscription | null = null;
    let active = true;

    stream.value.subscribe(subscribeOptions).then((sub) => {
      if (active) {
        subscription = sub;
      } else {
        // The cleanup function already ran, unsubscribe immediately.
        sub.unsubscribe();
      }
    });

    onCleanup(() => {
      active = false;
      // If we don't have a subscription yet, it'll still get cleaned up once the promise resolves
      subscription?.unsubscribe();
    });
  });

  const syncStreamStatus = computed(() => status.value.forStream(stream.value) ?? null);

  return {
    status: syncStreamStatus
  };
};
