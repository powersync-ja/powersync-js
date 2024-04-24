import React from 'react';
import { usePowerSync } from './PowerSyncContext';

/**
 * @deprecated use {@link useQuery} instead.
 *
 * A hook to access a single static query.
 * For an updated result, use {@link usePowerSyncWatchedQuery} instead.
 */
export const usePowerSyncQuery = <T = any>(sqlStatement: string, parameters: any[] = []): T[] => {
  const powerSync = usePowerSync();
  if (!powerSync) {
    return [];
  }
  // This will return the previous parameters until the contents of parameters array change,
  // thereby providing a stable array reference and preventing excessive useEffect runs
  const memoizedParams = React.useMemo(() => parameters, [...parameters]);
  const [data, setData] = React.useState<T[]>([]);

  React.useEffect(() => {
    powerSync.readLock(async (tx) => {
      const result = await tx.getAll<T>(sqlStatement, parameters);
      setData(result);
    });
  }, [powerSync, sqlStatement, memoizedParams]);

  return data;
};
