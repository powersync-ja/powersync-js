import { SyncStatus } from '@journeyapps/powersync-sdk-common';
import { ref } from 'vue';
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

  const powerSync = usePowerSync();
  if (powerSync) {
    status.value = powerSync.value.currentStatus || status.value;

    powerSync.value.registerListener({
      statusChanged: (newStatus: SyncStatus) => {
        status.value = newStatus;
      }
    });

    hasSynced.value = powerSync.value.hasSynced;
    if (!hasSynced.value) {
      (async () => {
        await powerSync.value.waitForFirstSync();
        hasSynced.value = powerSync.value.hasSynced;
      })();
    }
  }

  return { status, hasSynced };
};
