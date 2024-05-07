import { SyncStatus } from '@powersync/common';
import { ref, watchEffect } from 'vue';
import { usePowerSync } from './powerSync';

/**
 * @deprecated Use {@link useStatus} instead.
 */
export const usePowerSyncStatus = () => {
  const powerSync = usePowerSync();
  const status = ref(new SyncStatus({}));

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
