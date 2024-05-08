import { usePowerSyncStatus } from './usePowerSyncStatus';

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
export const useStatus = usePowerSyncStatus;
