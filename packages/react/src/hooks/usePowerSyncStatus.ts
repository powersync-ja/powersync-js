import { useContext, useEffect, useState } from 'react';
import { PowerSyncContext } from './PowerSyncContext';

/**
 * @deprecated Use {@link useStatus} instead.
 *
 * Custom hook that provides access to the current status of PowerSync.
 * @returns The PowerSync Database status.
 * @example
 * const Component = () => {
 *   const status = usePowerSyncStatus();
 *
 *   return <div>
 *     status.connected ? 'wifi' : 'wifi-off'
 *   </div>
 * };
 */
export const usePowerSyncStatus = () => {
  const powerSync = useContext(PowerSyncContext);
  const [syncStatus, setSyncStatus] = useState(powerSync.currentStatus);

  useEffect(() => {
    const listener = powerSync.registerListener({
      statusChanged: (newStatus) => {
        setSyncStatus(prev => {
          // Only update if the status is actually different
          return prev.isEqual(newStatus) ? prev : newStatus
        })
      }
    })

    return () => listener?.();
  }, [powerSync]);

  return syncStatus;
};
