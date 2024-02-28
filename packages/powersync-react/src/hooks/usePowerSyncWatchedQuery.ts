import { QueryWithResult, SQLWatchOptions } from '@journeyapps/powersync-sdk-common';
import React from 'react';
import { usePowerSync } from './PowerSyncContext';

/**
 * A hook to access the results of a watched query.
 */
export const usePowerSyncWatchedQuery = <T = any>(
  query: string | QueryWithResult<T>,
  parameters: any[] = [],
  options: Omit<SQLWatchOptions, 'signal'> = {}
): T[] => {
  let initialResults = [];

  if (typeof query != 'string') {
    initialResults = query.initialResults;
    parameters = query.query.parameters;
    query = query.query.sql;
  }

  const powerSync = usePowerSync();
  if (!powerSync) {
    return initialResults;
  }

  const memoizedParams = React.useMemo(() => parameters, [...parameters]);
  const memoizedOptions = React.useMemo(() => options, [JSON.stringify(options)]);
  const [data, setData] = React.useState<T[]>(initialResults);
  const abortController = React.useRef(new AbortController());

  React.useEffect(() => {
    // Abort any previous watches
    abortController.current?.abort();
    abortController.current = new AbortController();
    (async () => {
      for await (const result of powerSync.watch(query as string, parameters, {
        ...options,
        signal: abortController.current.signal
      })) {
        setData(result.rows?._array ?? []);
      }
    })();

    return () => {
      abortController.current?.abort();
    };
  }, [powerSync, query, memoizedParams, memoizedOptions]);

  return data;
};

export const useWatchedQuery = <T = any>(
  query: QueryWithResult<T>,
  options: Omit<SQLWatchOptions, 'signal'> = {}
): T[] => {
  const powerSync = usePowerSync();
  if (!powerSync) {
    return [];
  }

  const memoizedParams = React.useMemo(() => query.query.parameters, [...query.query.parameters]);
  const memoizedOptions = React.useMemo(() => options, [JSON.stringify(options)]);
  const [data, setData] = React.useState<T[]>(query.initialResults);
  const abortController = React.useRef(new AbortController());

  React.useEffect(() => {
    // Abort any previous watches
    abortController.current?.abort();
    abortController.current = new AbortController();
    (async () => {
      for await (const result of powerSync.watch(query.query.sql, memoizedParams, {
        ...options,
        signal: abortController.current.signal
      })) {
        setData(result.rows?._array ?? []);
      }
    })();

    return () => {
      abortController.current?.abort();
    };
  }, [powerSync, query.query.sql, memoizedParams, memoizedOptions]);

  return data;
};
