import { usePowerSyncStatus } from './usePowerSyncStatus';

/**
 * Custom hook that provides access to the current status of PowerSync.
 * @returns The PowerSync Database status.
 * @example
 * import { useStatus } from "@powersync/react";
 *
 * const Component = () => {
 *   const status = useStatus();
 *
 *   return <div>
 *     status.connected ? 'wifi' : 'wifi-off'
 *   </div>
 * };
 */
export const useStatus = usePowerSyncStatus;
