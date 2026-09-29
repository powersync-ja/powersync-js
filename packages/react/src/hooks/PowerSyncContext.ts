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
export const usePowerSync = () => usePowerSyncOrNull()!;

export const usePowerSyncOrNull = () => React.useContext(PowerSyncContext);
