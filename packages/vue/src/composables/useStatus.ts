import { usePowerSyncStatus } from './usePowerSyncStatus';

/**
 * Retrieve the current synchronization status of PowerSync.
 * @returns SyncStatus
 * @example
 * <script>
 *  import { useStatus } from '@powersync/vue';
 *
 *  const status = useStatus()
 *  const { connected, dataFlow, lastSyncedAt, hasSynced } = status;
 * <script>
 */
export const useStatus = usePowerSyncStatus;
