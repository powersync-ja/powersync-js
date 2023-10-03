import React from 'react';
import { usePowerSync } from './PowerSyncContext';

/**
 * A hook to access a single static query.
 * For an updated result, use usePowerSyncWatchedQuery instead
 */
export const usePowerSyncQuery = <T = any>(sqlStatement: string, parameters: any[] = []): T[] => {
  const powerSync = usePowerSync();
  if (!powerSync) {
    return [];
  }

  const [data, setData] = React.useState<T[]>([]);

  React.useEffect(() => {
    powerSync.execute(sqlStatement, parameters).then((result) => {
      setData(result.rows?._array ?? []);
    });
  }, [powerSync, sqlStatement, parameters]);

  return data;
};
