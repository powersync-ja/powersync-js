import {
  AbstractPowerSyncDatabase,
  parseQuery,
  WatchedQueryState,
  type CompilableQuery,
  type ParsedQuery,
  type SQLWatchOptions
} from '@powersync/common';
import React from 'react';
import { usePowerSync } from './PowerSyncContext';

interface HookWatchOptions extends Omit<SQLWatchOptions, 'signal'> {
  reportFetching?: boolean;
}

export interface AdditionalOptions extends HookWatchOptions {
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

type InternalHookOptions<T> = {
  query: string;
  parameters: any[];
  powerSync: AbstractPowerSyncDatabase;
  queryChanged: boolean;
  queryExecutor?: () => Promise<T[]> | null;
};

const checkQueryChanged = <T>(sqlStatement: string, queryParameters: any[], options: AdditionalOptions) => {
  const stringifiedParams = JSON.stringify(queryParameters);
  const stringifiedOptions = JSON.stringify(options);

  const previousQueryRef = React.useRef({ sqlStatement, stringifiedParams, stringifiedOptions });

  if (
    previousQueryRef.current.sqlStatement !== sqlStatement ||
    previousQueryRef.current.stringifiedParams != stringifiedParams ||
    previousQueryRef.current.stringifiedOptions != stringifiedOptions
  ) {
    previousQueryRef.current.sqlStatement = sqlStatement;
    previousQueryRef.current.stringifiedParams = stringifiedParams;
    previousQueryRef.current.stringifiedOptions = stringifiedOptions;

    return true;
  }

  return false;
};

const useSingleQuery = <T = any>(options: InternalHookOptions<T>): QueryResult<T> => {
  const { query, parameters, powerSync, queryExecutor, queryChanged } = options;

  const [output, setOutputState] = React.useState<QueryResult<T>>({
    isLoading: true,
    isFetching: true,
    data: [],
    error: undefined
  });

  const runQuery = React.useCallback(
    async (signal?: AbortSignal) => {
      setOutputState((prev) => ({ ...prev, isLoading: true, isFetching: true, error: undefined }));
      try {
        const result = queryExecutor ? await queryExecutor() : await powerSync.getAll<T>(query, parameters);
        if (signal.aborted) {
          return;
        }
        setOutputState((prev) => ({
          ...prev,
          isLoading: false,
          isFetching: false,
          data: result ?? [],
          error: undefined
        }));
      } catch (error) {
        setOutputState((prev) => ({
          ...prev,
          isLoading: false,
          isFetching: false,
          data: [],
          error
        }));
      }
    },
    [queryChanged, queryExecutor]
  );

  // Trigger initial query execution
  React.useEffect(() => {
    const abortController = new AbortController();
    runQuery(abortController.signal);
    return () => {
      abortController.abort();
    };
  }, [powerSync, queryChanged]);

  return {
    ...output,
    refresh: runQuery
  };
};

const useWatchedQuery = <T = any>(options: InternalHookOptions<T> & { options: HookWatchOptions }): QueryResult<T> => {
  const { query, parameters, powerSync, queryExecutor, queryChanged, options: hookOptions } = options;
  const createWatchedQuery = React.useCallback(() => {
    return powerSync.incrementalWatch<T>({
      sql: query,
      parameters,
      queryExecutor,
      throttleMs: hookOptions.throttleMs,
      reportFetching: hookOptions.reportFetching
    });
  }, []);

  const [watchedQuery, setWatchedQuery] = React.useState(createWatchedQuery);

  const mapState = React.useCallback(
    (state: WatchedQueryState<T>) => ({
      isFetching: state.fetching,
      isLoading: state.loading,
      data: state.data.all,
      error: state.error
    }),
    []
  );

  const [output, setOutputState] = React.useState(mapState(watchedQuery.state));

  React.useEffect(() => {
    watchedQuery.close();
    setWatchedQuery(createWatchedQuery);
  }, [powerSync]);

  React.useEffect(() => {
    watchedQuery.stream().forEach(async (val) => {
      setOutputState(mapState(val));
    });

    return () => {
      watchedQuery.close();
    };
  }, [watchedQuery]);

  // Indicates that the query will be re-fetched due to a change in the query.
  // Used when `isFetching` hasn't been set to true yet due to React execution.
  React.useEffect(() => {
    if (queryChanged) {
      watchedQuery.updateQuery({
        query,
        parameters: parameters,
        throttleMs: hookOptions.throttleMs,
        queryExecutor,
        reportFetching: hookOptions.reportFetching
      });
    }
  }, [queryChanged]);

  return output;
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

  const queryChanged = checkQueryChanged(sqlStatement, queryParameters, options);
  const queryExecutor = typeof query == 'object' ? query.execute : undefined;

  switch (options.runQueryOnce) {
    case true:
      return useSingleQuery<T>({
        query: sqlStatement,
        parameters: queryParameters,
        powerSync,
        queryExecutor,
        queryChanged
      });
    default:
      return useWatchedQuery<T>({
        query: sqlStatement,
        parameters: queryParameters,
        powerSync,
        queryExecutor,
        queryChanged,
        options
      });
  }
};
