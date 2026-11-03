import { CommonPowerSyncDatabase } from '@powersync/common';
import React from 'react';

export const PowerSyncContext = React.createContext<CommonPowerSyncDatabase | null>(null);
/**
 * Custom hook that provides access to the PowerSync context.
 * @returns The PowerSync Database instance.
 * @example
 * const Component = () => {
 *   const db = usePowerSync();
 *   const [lists, setLists] = React.useState([]);
 *
 *   React.useEffect(() => {
 *     powersync.getAll('SELECT * from lists').then(setLists)
 *   }, []);
 *
 *   return <ul>
 *     {lists.map(list => <li key={list.id}>{list.name}</li>)}
 *   </ul>
 * };
 */
export function usePowerSync() {
  const db = usePowerSyncOrNull();
  if (db == null) throw new Error('PowerSync not configured.');
  return db;
}

/**
 * A variant of {@link usePowerSync} that returns null when no PowerSync database is in context (instead of throwing).
 *
 * @returns The PowerSync database instance, or null.
 */
export function usePowerSyncOrNull(): CommonPowerSyncDatabase | null {
  return React.useContext(PowerSyncContext);
}
