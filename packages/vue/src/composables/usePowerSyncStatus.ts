import { SyncStatus } from '@powersync/common';
import { onUnmounted, ref } from 'vue';
import { usePowerSync } from './powerSync';

export const usePowerSyncStatus = () => {
  const status = ref(new SyncStatus({}));

  let cleanup = () => {};
  const powerSync = usePowerSync();
  if (powerSync) {
    status.value = powerSync.value.currentStatus || status.value;

    const disposeListener = powerSync.value.registerListener({
      statusChanged: (newStatus: SyncStatus) => {
        status.value = newStatus;
      }
    });

    cleanup = () => {
      disposeListener();
    };
  }

  onUnmounted(() => {
    cleanup();
  });

  return { status };
};
