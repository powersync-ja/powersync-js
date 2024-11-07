import { parseQuery, type CompilableQuery, type ParsedQuery, type SQLWatchOptions } from '@powersync/common';
import React from 'react';
import { usePowerSync } from './PowerSyncContext';

export interface AdditionalOptions extends Omit<SQLWatchOptions, 'signal'> {
  runQueryOnce?: boolean;
}

export type QueryResult<T> = {
  data: T[];
  /**
   * Indicates the initial loading state (hard loading). Loading becomes false once the first set of results from the watched query is available or an error occurs.
   */
  isLoading: boolean;
  /**
   * Indicates whether the query is currently fetching data, is true during the initial load and any time when the query is re-evaluating (useful for large queries).
   */
  isFetching: boolean;
  error: Error | undefined;
  /**
   * Function used to run the query again.
   */
  refresh?: () => Promise<void>;
};

/**
 * A hook to access the results of a watched query.
 * @example
 * export const Component = () => {
 * const { data: lists }  = useQuery('SELECT * from lists');
 *
 * return <View>
 *   {lists.map((l) => (
 *     <Text key={l.id}>{JSON.stringify(l)}</Text>
 *   ))}
 * </View>
 * }
 */
export const useQuery = <T = any>(
  query: string | CompilableQuery<T>,
  parameters: any[] = [],
  options: AdditionalOptions = { runQueryOnce: false }
): QueryResult<T> => {
  const powerSync = usePowerSync();
  if (!powerSync) {
    return { isLoading: false, isFetching: false, data: [], error: new Error('PowerSync not configured.') };
  }

  let parsedQuery: ParsedQuery;
  try {
    parsedQuery = parseQuery(query, parameters);
  } catch (error) {
    console.error('Failed to parse query:', error);
    return { isLoading: false, isFetching: false, data: [], error };
  }

  const { sqlStatement, parameters: queryParameters } = parsedQuery;

  const [data, setData] = React.useState<T[]>([]);
  const [error, setError] = React.useState<Error | undefined>(undefined);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isFetching, setIsFetching] = React.useState(true);
  const [tables, setTables] = React.useState([]);

  const memoizedParams = React.useMemo(() => queryParameters, [JSON.stringify(queryParameters)]);
  const memoizedOptions = React.useMemo(() => options, [JSON.stringify(options)]);
  const abortController = React.useRef(new AbortController());

  const previousQueryRef = React.useRef({ sqlStatement, memoizedParams });

  // Indicates that the query will be re-fetched due to a change in the query.
  // Used when `isFetching` hasn't been set to true yet due to React execution.
  const shouldFetch = React.useMemo(
    () =>
      previousQueryRef.current.sqlStatement !== sqlStatement ||
      JSON.stringify(previousQueryRef.current.memoizedParams) != JSON.stringify(memoizedParams),
    [powerSync, sqlStatement, memoizedParams, isFetching]
  );

  const handleResult = (result: T[]) => {
    previousQueryRef.current = { sqlStatement, memoizedParams };
    setData(result);
    setIsLoading(false);
    setIsFetching(false);
    setError(undefined);
  };

  const handleError = (e: Error) => {
    previousQueryRef.current = { sqlStatement, memoizedParams };
    setData([]);
    setIsLoading(false);
    setIsFetching(false);
    const wrappedError = new Error('PowerSync failed to fetch data: ' + e.message);
    wrappedError.cause = e;
    setError(wrappedError);
  };

  const fetchData = async () => {
    setIsFetching(true);
    try {
      const result =
        typeof query == 'string' ? await powerSync.getAll<T>(sqlStatement, queryParameters) : await query.execute();
      handleResult(result);
    } catch (e) {
      console.error('Failed to fetch data:', e);
      handleError(e);
    }
  };

  const fetchTables = async () => {
    try {
      const tables = await powerSync.resolveTables(sqlStatement, memoizedParams, memoizedOptions);
      setTables(tables);
    } catch (e) {
      console.error('Failed to fetch tables:', e);
      handleError(e);
    }
  };

  React.useEffect(() => {
    const updateData = async () => {
      await fetchTables();
      await fetchData();
    };

    updateData();

    const l = powerSync.registerListener({
      schemaChanged: updateData
    });

    return () => l?.();
  }, [powerSync, memoizedParams, sqlStatement]);

  React.useEffect(() => {
    // Abort any previous watches
    abortController.current?.abort();
    abortController.current = new AbortController();

    if (!options.runQueryOnce) {
      powerSync.onChangeWithCallback(
        {
          onChange: async () => {
            await fetchData();
          },
          onError(e) {
            handleError(e);
          }
        },
        {
          ...options,
          signal: abortController.current.signal,
          tables
        }
      );
    }

    return () => {
      abortController.current?.abort();
    };
  }, [powerSync, sqlStatement, memoizedParams, memoizedOptions, tables]);

  return { isLoading, isFetching: isFetching || shouldFetch, data, error, refresh: fetchData };
};
