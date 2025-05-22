import {
  AbstractPowerSyncDatabase,
  WatchCompatibleQuery,
  type CompilableQuery,
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

type InternalHookOptions<DataType> = {
  query: WatchCompatibleQuery<DataType>;
  powerSync: AbstractPowerSyncDatabase;
  queryChanged: boolean;
};

const checkQueryChanged = <T>(query: WatchCompatibleQuery<T>, options: AdditionalOptions) => {
  const compiled = query.compile();
  const stringifiedParams = JSON.stringify(compiled.parameters);
  const stringifiedOptions = JSON.stringify(options);

  const previousQueryRef = React.useRef({ sqlStatement: compiled.sql, stringifiedParams, stringifiedOptions });

  if (
    previousQueryRef.current.sqlStatement !== compiled.sql ||
    previousQueryRef.current.stringifiedParams != stringifiedParams ||
    previousQueryRef.current.stringifiedOptions != stringifiedOptions
  ) {
    previousQueryRef.current.sqlStatement = compiled.sql;
    previousQueryRef.current.stringifiedParams = stringifiedParams;
    previousQueryRef.current.stringifiedOptions = stringifiedOptions;

    return true;
  }

  return false;
};

const useSingleQuery = <RowType = any>(options: InternalHookOptions<RowType[]>): QueryResult<RowType> => {
  const { query, powerSync, queryChanged } = options;

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
        const result = await query.execute(query.compile());
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
    [queryChanged, query]
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
  options: InternalHookOptions<RowType[]> & { options: HookWatchOptions }
): QueryResult<RowType> => {
  const { query, powerSync, queryChanged, options: hookOptions } = options;

  const createWatchedQuery = React.useCallback(() => {
    return powerSync.incrementalWatch<RowType[]>({
      // This always enables comparison. Might want to be able to disable this??
      mode: 'comparison',
      watchOptions: {
        placeholderData: [],
        query,
        throttleMs: hookOptions.throttleMs,
        reportFetching: hookOptions.reportFetching
      }
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
      watchedQuery.updateSettings({
        placeholderData: [],
        query,
        throttleMs: hookOptions.throttleMs,
        reportFetching: hookOptions.reportFetching
      });
    }
  }, [queryChanged]);

  return output;
};

export const constructCompatibleQuery = <RowType>(
  query: string | CompilableQuery<RowType>,
  parameters: any[] = [],
  options: AdditionalOptions
) => {
  const powerSync = usePowerSync();

  const parsedQuery = React.useMemo<WatchCompatibleQuery<RowType[]>>(() => {
    if (typeof query == 'string') {
      return {
        compile: () => ({
          sql: query,
          parameters: parameters
        }),
        execute: () => powerSync.getAll(query, parameters)
      };
    } else {
      return {
        // Generics differ a bit but holistically this is the same
        compile: () => query.compile(),
        execute: () => query.execute()
      };
    }
  }, [query]);

  const queryChanged = checkQueryChanged(parsedQuery, options);

  return {
    parsedQuery,
    queryChanged
  };
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
  if (!powerSync) {
    return { isLoading: false, isFetching: false, data: [], error: new Error('PowerSync not configured.') };
  }

  const { parsedQuery, queryChanged } = constructCompatibleQuery(query, parameters, options);

  switch (options.runQueryOnce) {
    case true:
      return useSingleQuery<RowType>({
        query: parsedQuery,
        powerSync,
        queryChanged
      });
    default:
      return useWatchedQuery<RowType>({
        query: parsedQuery,
        powerSync,
        queryChanged,
        options
      });
  }
};
