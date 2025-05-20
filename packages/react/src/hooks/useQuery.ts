import {
  AbstractPowerSyncDatabase,
  parseQuery,
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

export type QueryResult<RowType> = {
  data: RowType[];
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

type InternalHookOptions<RowType> = {
  query: string;
  parameters: any[];
  powerSync: AbstractPowerSyncDatabase;
  queryChanged: boolean;
  queryExecutor?: () => Promise<RowType[]>;
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

const useSingleQuery = <RowType = any>(options: InternalHookOptions<RowType>): QueryResult<RowType> => {
  const { query, parameters, powerSync, queryExecutor, queryChanged } = options;

  const [output, setOutputState] = React.useState<QueryResult<RowType>>({
    isLoading: true,
    isFetching: true,
    data: [],
    error: undefined
  });

  const runQuery = React.useCallback(
    async (signal?: AbortSignal) => {
      setOutputState((prev) => ({ ...prev, isLoading: true, isFetching: true, error: undefined }));
      try {
        const result = queryExecutor ? await queryExecutor() : await powerSync.getAll<RowType>(query, parameters);
        if (signal.aborted) {
          return;
        }
        setOutputState((prev) => ({
          ...prev,
          isLoading: false,
          isFetching: false,
          data: result,
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

const useWatchedQuery = <RowType = unknown>(
  options: InternalHookOptions<RowType> & { options: HookWatchOptions }
): QueryResult<RowType> => {
  const { query, parameters, powerSync, queryExecutor, queryChanged, options: hookOptions } = options;

  const createWatchedQuery = React.useCallback(() => {
    return powerSync.incrementalWatch<RowType[]>({
      sql: query,
      parameters,
      customExecutor: queryExecutor
        ? {
            execute: queryExecutor,
            // This assumes the custom query executor will return an array of data,
            // which is the requirement of CompatibleQuery.
            initialData: []
          }
        : undefined,
      throttleMs: hookOptions.throttleMs,
      reportFetching: hookOptions.reportFetching
    });
  }, []);

  const [watchedQuery, setWatchedQuery] = React.useState(createWatchedQuery);

  const [output, setOutputState] = React.useState(watchedQuery.state);

  React.useEffect(() => {
    watchedQuery.close();
    setWatchedQuery(createWatchedQuery);
  }, [powerSync]);

  React.useEffect(() => {
    const dispose = watchedQuery.subscribe({
      onStateChange: (state) => {
        setOutputState({ ...state });
      }
    });

    return () => {
      dispose();
      watchedQuery.close();
    };
  }, [watchedQuery]);

  // Indicates that the query will be re-fetched due to a change in the query.
  // Used when `isFetching` hasn't been set to true yet due to React execution.
  React.useEffect(() => {
    if (queryChanged) {
      console.log('Query changed, re-fetching...');
      watchedQuery.updateQuery({
        sql: query,
        parameters: parameters,
        throttleMs: hookOptions.throttleMs,
        customExecutor: queryExecutor ? { execute: queryExecutor, initialData: [] } : undefined,
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
export const useQuery = <RowType = any>(
  query: string | CompilableQuery<RowType>,
  parameters: any[] = [],
  options: AdditionalOptions = { runQueryOnce: false }
): QueryResult<RowType> => {
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
      return useSingleQuery<RowType>({
        query: sqlStatement,
        parameters: queryParameters,
        powerSync,
        queryExecutor,
        queryChanged
      });
    default:
      return useWatchedQuery<RowType>({
        query: sqlStatement,
        parameters: queryParameters,
        powerSync,
        queryExecutor,
        queryChanged,
        options
      });
  }
};
