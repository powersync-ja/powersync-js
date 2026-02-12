import { SyncStatus } from '@powersync/common';
import { ref, watchEffect } from 'vue';
import { usePowerSync } from './powerSync.js';

/**
 * Retrieve the current synchronization status of PowerSync.
 * @returns SyncStatus
 * @example
 * ```vue
 * <script setup>
 * import { useStatus } from '@powersync/vue';
 *
 * const status = useStatus();
 * <script>
 * ```
 */
export const useStatus = () => {
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
