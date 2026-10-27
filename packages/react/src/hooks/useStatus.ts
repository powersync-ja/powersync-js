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
  return useStatusInternal(false);
}

/**
 * A variant of {@link useStatus} that returns null when no PowerSync database is in context (instead of throwing).
 *
 * @returns The current sync status of the PowerSync database, or null.
 */
export function useStatusOrNull(): SyncStatus | null {
  return useStatusInternal(true);
}

/**
 * @internal
 */
function useStatusInternal(allowNull?: boolean): SyncStatus | null;
function useStatusInternal(allowNull: false): SyncStatus;

function useStatusInternal(allowNull: boolean = true): SyncStatus | null {
  // Conditional hook is okay, this is an internal hook and allowNull is a constant on each call site.
  const powerSync = allowNull ? usePowerSyncOrNull() : usePowerSync();
  const [syncStatus, setSyncStatus] = useState(powerSync?.currentStatus);

  useEffect(() => {
    setSyncStatus(powerSync?.currentStatus);

    const listener = powerSync?.registerListener({
      statusChanged: (status) => {
        setSyncStatus(status);
      }
    });

    return () => listener?.();
  }, [powerSync]);

  return syncStatus ?? null;
}
