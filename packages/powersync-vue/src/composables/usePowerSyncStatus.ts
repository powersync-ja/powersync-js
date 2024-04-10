import { SyncStatus } from '@journeyapps/powersync-sdk-common';
import { onUnmounted, ref } from 'vue';
import { usePowerSync } from './powerSync';

export const usePowerSyncStatus = () => {
  const status = ref(
    new SyncStatus({
      connected: false,
      lastSyncedAt: undefined,
      dataFlow: {
        uploading: false,
        downloading: false
      }
    })
  );
  const hasSynced = ref(false);

  let cleanup = () => {};
  const powerSync = usePowerSync();
  if (powerSync) {
    status.value = powerSync.value.currentStatus || status.value;

    const disposeListener = powerSync.value.registerListener({
      statusChanged: (newStatus: SyncStatus) => {
        status.value = newStatus;
      }
    });

    const firstSyncAbortController = new AbortController();
    hasSynced.value = powerSync.value.hasSynced;
    if (!hasSynced.value) {
      (async () => {
        await powerSync.value.waitForFirstSync(firstSyncAbortController.signal);
        hasSynced.value = powerSync.value.hasSynced;
      })();
    }

    cleanup = () => {
      disposeListener();
      firstSyncAbortController.abort();
    };
  }

  onUnmounted(() => {
    cleanup();
  });

  return { status, hasSynced };
};
