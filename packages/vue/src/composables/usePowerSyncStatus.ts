import { SyncStatus } from '@powersync/common';
import { ref, watchEffect, Ref } from 'vue';
import { usePowerSync } from './powerSync.js';

/**
 * @deprecated Use {@link useStatus} instead.
 */
export const usePowerSyncStatus = (): Ref<SyncStatus> => {
  const powerSync = usePowerSync();
  const status = ref<SyncStatus>();

  if (!powerSync) {
    return status;
  }

  status.value = powerSync.value.currentStatus || status.value;

  watchEffect((onCleanup) => {
    const listener = powerSync.value.registerListener({
      statusChanged: (newStatus: SyncStatus) => {
        status.value = newStatus;
      }
    });

    // Cleanup previous listener when the effect triggers again, or when the component is unmounted
    onCleanup(() => {
      listener();
    });
  });

  return status;
};
