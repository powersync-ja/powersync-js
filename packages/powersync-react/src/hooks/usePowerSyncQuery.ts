import React from "react";
import { usePowerSync } from "./PowerSyncContext";

/**
 * A hook to access a single static query.
 * For an updated result, use usePowerSyncWatchedQuery instead
 */
export const usePowerSyncQuery = <T = any>(
  sqlStatement: string,
  parameters: any[] = []
): T[] => {
  const powerSync = usePowerSync();
  if (!powerSync) {
    return [];
  }
  // This will return the previous parameters until the contents of parameters array change,
  // thereby providing a stable array reference and preventing excessive useEffect runs
  const memoizedParams = React.useMemo(() => parameters, [...parameters]);
  const [data, setData] = React.useState<T[]>([]);

  React.useEffect(() => {
    powerSync.execute(sqlStatement, parameters).then((result) => {
      setData(result.rows?._array ?? []);
    });
    //
  }, [powerSync, sqlStatement, memoizedParams]);

  return data;
};
