import { useEffect, useState } from 'react';
import { usePowerSync, usePowerSyncOrNull } from './PowerSyncContext.js';
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
export function useStatus(): SyncStatus {
  return useStatusOrNull(false);
}

/**
 * @internal
 */
export function useStatusOrNull(allowNull?: boolean): SyncStatus | null;
export function useStatusOrNull(allowNull: false): SyncStatus;

export function useStatusOrNull(allowNull: boolean = true): SyncStatus | null {
  // Conditional hook is okay, this is an internal hook and allowNull is a constant on each call site.
  const powerSync = allowNull ? usePowerSyncOrNull() : usePowerSync();
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
