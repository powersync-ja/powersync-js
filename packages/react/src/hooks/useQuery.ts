import { parseQuery, type CompilableQuery, type ParsedQuery, type SQLWatchOptions } from '@powersync/common';
import { WatchedQueryState } from '@powersync/common/src/client/watched/WatchedQuery';
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
  refresh?: (signal?: AbortSignal) => Promise<void>;
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
  const logger = powerSync?.logger ?? console;
  if (!powerSync) {
    return { isLoading: false, isFetching: false, data: [], error: new Error('PowerSync not configured.') };
  }

  let parsedQuery: ParsedQuery;
  try {
    parsedQuery = parseQuery(query, parameters);
  } catch (error) {
    logger.error('Failed to parse query:', error);
    return { isLoading: false, isFetching: false, data: [], error };
  }

  const { sqlStatement, parameters: queryParameters } = parsedQuery;

  const memoizedParams = React.useMemo(() => queryParameters, [JSON.stringify(queryParameters)]);
  const memoizedOptions = React.useMemo(() => options, [JSON.stringify(options)]);

  const previousQueryRef = React.useRef({ sqlStatement, memoizedParams });
  // TODO implement runQueryOnce
  const [watchedQuery] = React.useState(() => {
    return powerSync.watch2<T>({
      sql: sqlStatement,
      parameters: queryParameters,
      throttleMs: options.throttleMs
    });
  });

  const mapState = React.useCallback(
    (state: WatchedQueryState<T>) => ({
      isFetching: state.fetching,
      isLoading: state.loading,
      data: state.data.all,
      error: state.error,
      refresh: async () => {}
    }),
    []
  );

  const [output, setOutputState] = React.useState(mapState(watchedQuery.state));

  React.useEffect(() => {
    watchedQuery.stream().forEach(async (val) => {
      console.log('updating state');
      setOutputState(mapState(val));
    });

    return () => {
      watchedQuery.close();
    };
  }, []);

  // Indicates that the query will be re-fetched due to a change in the query.
  // Used when `isFetching` hasn't been set to true yet due to React execution.
  React.useEffect(() => {
    if (
      previousQueryRef.current.sqlStatement !== sqlStatement ||
      JSON.stringify(previousQueryRef.current.memoizedParams) != JSON.stringify(memoizedParams)
    ) {
      console.log('updating watched');
      watchedQuery.updateQuery({
        query: sqlStatement,
        parameters: queryParameters,
        throttleMs: options.throttleMs
      });
    }
  }, [powerSync, sqlStatement, memoizedParams]);

  return output;
};
