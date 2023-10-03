import { SQLWatchOptions } from '@journeyapps/powersync-sdk-common';
import React from 'react';
import { usePowerSync } from './PowerSyncContext';

/**
 * A hook to access the results of a watched query.
 */
export const usePowerSyncWatchedQuery = <T = any>(
  sqlStatement: string,
  parameters: any[] = [],
  options: Omit<SQLWatchOptions, 'signal'> = {}
): T[] => {
  const powerSync = usePowerSync();
  if (!powerSync) {
    return [];
  }

  const [data, setData] = React.useState<T[]>([]);
  const abortController = React.useRef(new AbortController());

  React.useEffect(() => {
    // Abort any previous watches
    abortController.current?.abort();
    abortController.current = new AbortController();
    (async () => {
      for await (const result of powerSync.watch(sqlStatement, parameters, {
        ...options,
        signal: abortController.current.signal
      })) {
        setData(result.rows?._array ?? []);
      }
    })();

    return () => {
      abortController.current?.abort();
    };
  }, [powerSync, sqlStatement, parameters]);

  return data;
};
