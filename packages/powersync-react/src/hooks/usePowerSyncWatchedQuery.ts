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

  const memoizedParams = React.useMemo(() => parameters, [...parameters]);
  const memoizedOptions = React.useMemo(() => options, [JSON.stringify(options)]);
  const [data, setData] = React.useState<T[]>([]);
  const abortController = React.useRef(new AbortController());

  React.useEffect(() => {
    // Abort any previous watches
    abortController.current?.abort();
    abortController.current = new AbortController();

    powerSync.watch(sqlStatement, parameters, {
      onResult(results) {
        setData(results.rows?._array ?? []);
      },
    }, {
      ...options,
      signal: abortController.current.signal
    });

    return () => {
      abortController.current?.abort();
    };
  }, [powerSync, sqlStatement, memoizedParams, memoizedOptions]);

  return data;
};
