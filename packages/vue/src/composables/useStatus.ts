import { SyncStatus } from '@powersync/common';
import { Ref, ref, watchEffect } from 'vue';
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
export const useStatus = (): Ref<SyncStatus> => {
  const powerSync = usePowerSync();
  const status = ref<SyncStatus>();

  if (!powerSync) {
    return status as any;
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
