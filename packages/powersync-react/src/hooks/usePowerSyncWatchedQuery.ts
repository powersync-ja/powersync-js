import { Query, SQLWatchOptions } from '@journeyapps/powersync-sdk-common';
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
  }, [powerSync, sqlStatement, memoizedParams, memoizedOptions]);

  return data;
};

export interface QueryWithResult<T> {
  initialResults: T[];
  query: Query<T>;
}

export type QuerySet = Record<string, Query<any>>;
export type QueryResultUnwrapped<Q> = Q extends Query<infer T> ? T : never;

export type QueryResults<T extends QuerySet> = { [K in keyof T]: QueryWithResult<QueryResultUnwrapped<T[K]>> };

export async function preloadQuery<T>(query: Query<T>): Promise<QueryWithResult<T>> {
  const r = await query.getAll();
  return {
    initialResults: r,
    query
  } as QueryWithResult<T>;
}

export async function preloadQueries<T extends QuerySet>(queries: T): Promise<QueryResults<T>> {
  const promises = Object.entries(queries).map(async ([key, query]) => {
    return [key, await preloadQuery(query)] as const;
  });
  return Object.fromEntries(await Promise.all(promises)) as QueryResults<T>;
}

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
  // const [data, setData] = React.useState<T[]>(query.initialResults);
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
