import { useCallback, useSyncExternalStore } from 'react';
import { usePowerSync, usePowerSyncOrNull } from './PowerSyncContext.js';
import { CommonPowerSyncDatabase, SyncStatus } from '@powersync/common';

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
  return useStatusOf(usePowerSync())!;
}

/**
 * A variant of {@link useStatus} that returns null when no PowerSync database is in context (instead of throwing).
 *
 * @returns The current sync status of the PowerSync database, or null.
 */
export function useStatusOrNull(): SyncStatus | null {
  return useStatusOf(usePowerSyncOrNull());
}

function useStatusOf(powerSync: CommonPowerSyncDatabase | null): SyncStatus | null {
  const subscribe = useCallback(
    (listener: () => void) => {
      const dispose = powerSync?.registerListener({ statusChanged: listener });
      return dispose ?? function () {};
    },
    // Ensure React treats changed databases as new stores
    [powerSync]
  );

  const getSnapshot = () => powerSync?.currentStatus ?? null;

  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
