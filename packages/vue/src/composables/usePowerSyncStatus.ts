import { SyncStatus } from '@powersync/common';
import { onUnmounted, ref } from 'vue';
import { usePowerSync } from './powerSync';

/**
 * @deprecated Use {@link useStatus} instead.
 */
export const usePowerSyncStatus = () => {
  const status = ref(new SyncStatus({}));

  const powerSync = usePowerSync();

  if (!powerSync) {
    return;
  }

  status.value = powerSync.value.currentStatus || status.value;

  const runListener = () =>
    powerSync.value.registerListener({
      statusChanged: (newStatus: SyncStatus) => {
        status.value = newStatus;
      }
    });

  onUnmounted(() => {
    runListener();
  });

  return { status };
};
