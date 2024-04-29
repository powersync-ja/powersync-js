import { SQLWatchOptions } from '@powersync/common';
import React from 'react';
import { usePowerSync } from './PowerSyncContext';

interface AdditionalOptions extends Omit<SQLWatchOptions, 'signal'> {
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
  sqlStatement: string,
  parameters: any[] = [],
  options: AdditionalOptions = {}
): QueryResult<T> => {
  const powerSync = usePowerSync();
  if (!powerSync) {
    return { isLoading: false, isFetching: false, data: [], error: new Error('PowerSync not configured.') };
  }

  const [data, setData] = React.useState<T[]>([]);
  const [error, setError] = React.useState<Error | undefined>(undefined);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isFetching, setIsFetching] = React.useState(true);

  const memoizedParams = React.useMemo(() => parameters, [...parameters]);
  const memoizedOptions = React.useMemo(() => options, [JSON.stringify(options)]);
  const abortController = React.useRef(new AbortController());

  const handleResult = (result: T[]) => {
    setIsLoading(false);
    setIsFetching(false);
    setData(result);
    setError(undefined);
  };

  const handleError = (e: Error) => {
    setIsLoading(false);
    setIsFetching(false);
    setData([]);
    const wrappedError = new Error('PowerSync failed to fetch data: ' + e.message);
    wrappedError.cause = e;
    setError(wrappedError);
  };

  const fetchData = async () => {
    setIsFetching(true);
    try {
      const result = await powerSync.getAll<T>(sqlStatement, parameters);
      handleResult(result);
    } catch (e) {
      handleError(e);
    }
  };

  const fetchTables = async () => {
    let tables = [];
    try {
      tables = await powerSync.resolveTables(sqlStatement, memoizedParams, memoizedOptions);
    } catch (e) {
      handleError(e);
    }

    return tables;
  };

  React.useEffect(() => {
    // Abort any previous watches
    abortController.current?.abort();
    abortController.current = new AbortController();
    let tables = [];
    fetchTables().then((t) => {
      tables = t;
    });

    if (options.runQueryOnce) {
      fetchData();
    } else {
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
  }, [powerSync, sqlStatement, memoizedParams, memoizedOptions]);

  return { isLoading, isFetching, data, error, refresh: fetchData };
};
