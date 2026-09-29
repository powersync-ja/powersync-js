import { useEffect, useState } from 'react';
import { usePowerSyncOrNull } from './PowerSyncContext.js';
import { SyncStatus } from '@powersync/common';

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
export function useStatus() {
  return useStatusOrNull()!;
}

/**
 * @internal
 */
export function useStatusOrNull(): SyncStatus | null {
  const powerSync = usePowerSyncOrNull();
  const [syncStatus, setSyncStatus] = useState(powerSync?.currentStatus ?? null);

  useEffect(() => {
    const listener = powerSync?.registerListener({
      statusChanged: (status) => {
        setSyncStatus(status);
      }
    });

    return () => listener?.();
  }, [powerSync]);

  return syncStatus;
}
