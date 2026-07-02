import { useContext, useEffect, useState } from 'react';
import { PowerSyncContext } from './PowerSyncContext.js';

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
  const powerSync = useContext(PowerSyncContext);
  const [syncStatus, setSyncStatus] = useState(powerSync.currentStatus);

  useEffect(() => {
    const listener = powerSync.registerListener({
      statusChanged: (status) => {
        setSyncStatus(status);
      }
    });

    return () => listener?.();
  }, [powerSync]);

  return syncStatus;
}
