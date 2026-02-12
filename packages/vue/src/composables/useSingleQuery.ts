import {
  type CompilableQuery,
  DifferentialWatchedQueryComparator,
  ParsedQuery,
  parseQuery,
  SQLOnChangeOptions
} from '@powersync/common';
import { type MaybeRef, type Ref, ref, toValue, watchEffect } from 'vue';
import { usePowerSync } from './powerSync.js';
import { QuerySyncStreamOptions } from './useAllSyncStreamsHaveSynced.js';

export interface AdditionalOptions<RowType = unknown> extends Omit<SQLOnChangeOptions, 'signal'> {
  runQueryOnce?: boolean;
  /**
   * Used to compare query result sets.
   *
   * By default the hook will requery on any dependent table change. This will
   * emit a new hook result even if the result set has not changed.
   *
   * Specifying a {@link DifferentialWatchedQueryComparator} will remove emissions for
   * unchanged result sets.
   * Furthermore, emitted `data` arrays will preserve object references between result set emissions
   * for unchanged rows.
   * @example
   * ```javascript
   * {
   *  rowComparator: {
   *    keyBy: (item) => item.id,
   *    compareBy: (item) => JSON.stringify(item)
   *  }
   * }
   * ```
   */
  rowComparator?: DifferentialWatchedQueryComparator<RowType>;
  /**
   * An optional array of sync streams (with names and parameters) backing the query.
   *
   * When set, `useQuery` will subscribe to those streams (and automatically handle unsubscribing from them, too).
   *
   * If {@link QuerySyncStreamOptions} is set on a stream, `useQuery` will remain in a loading state until that stream
   * is marked as {@link SyncSubscriptionDescription.hasSynced}. This ensures the query is not missing rows that haven't
   * been downloaded.
   * Note however that after an initial sync, the query will not block itself while new rows are downloading. Instead,
   * consistent sync snapshots will be made available as they've been processed by PowerSync.
   *
   * @experimental Sync streams are currently in alpha.
   */
  streams?: QuerySyncStreamOptions[];

  /**
   * If true (default) the watched query will update its state to report
   * on the fetching state of the query.
   * Setting to false reduces the number of state changes if the fetch status
   * is not relevant to the consumer.
   */
  reportFetching?: boolean;
}

export type WatchedQueryResult<T> = {
  readonly data: Ref<ReadonlyArray<Readonly<T>>>;
  /**
   * Indicates the initial loading state (hard loading). Loading becomes false once the first set of results from the watched query is available or an error occurs.
   */
  readonly isLoading: Ref<boolean>;
  /**
   * Indicates whether the query is currently fetching data, is true during the initial load and any time when the query is re-evaluating (useful for large queries).
   */
  readonly isFetching: Ref<boolean>;
  readonly error: Ref<Error | undefined>;
  /**
   * Function used to run the query again.
   */
  refresh?: () => Promise<void>;
};

export const useSingleQuery = <T = any>(
  query: MaybeRef<string | CompilableQuery<T>>,
  sqlParameters: MaybeRef<any[]> = [],
  options: AdditionalOptions<T> & { active?: MaybeRef<boolean> } = {}
): WatchedQueryResult<T> => {
  const data = ref<ReadonlyArray<Readonly<T>>>([]) as Ref<ReadonlyArray<Readonly<T>>>;
  const error = ref<Error | undefined>(undefined);
  const isLoading = ref(true);
  const isFetching = ref(true);

  // Only defined when the query and parameters are successfully parsed and tables are resolved
  let fetchData: () => Promise<void> | undefined;

  const powerSync = usePowerSync();
  const logger = powerSync?.value?.logger ?? console;

  const finishLoading = () => {
    isLoading.value = false;
    isFetching.value = false;
  };

  if (!powerSync || !powerSync.value) {
    finishLoading();
    error.value = new Error('PowerSync not configured.');
    return { data, isLoading, isFetching, error };
  }

  const handleResult = (result: T[]) => {
    finishLoading();
    data.value = result;
    error.value = undefined;
  };

  const handleError = (e: Error) => {
    fetchData = undefined;
    finishLoading();
    data.value = [];

    const wrappedError = new Error('PowerSync failed to fetch data: ' + e.message);
    wrappedError.cause = e;
    error.value = wrappedError;
  };

  watchEffect(async (onCleanup) => {
    const isActive = toValue(options.active ?? true);
    if (!isActive) {
      fetchData = undefined;
      return; // Don't run if not active
    }

    const abortController = new AbortController();
    // Abort any previous watches when the effect triggers again, or when the component is unmounted
    onCleanup(() => abortController.abort());

    let parsedQuery: ParsedQuery;
    const queryValue = toValue(query);
    try {
      parsedQuery = parseQuery(queryValue, toValue(sqlParameters).map(toValue));
    } catch (e) {
      logger.error('Failed to parse query:', e);
      handleError(e);
      return;
    }

    const { sqlStatement: sql, parameters } = parsedQuery;
    // Fetch initial data
    const executor =
      typeof queryValue == 'string' ? () => powerSync.value.getAll<T>(sql, parameters) : () => queryValue.execute();

    fetchData = async () => {
      isFetching.value = true;
      try {
        const result = await executor();
        handleResult(result);
      } catch (e) {
        logger.error('Failed to fetch data:', e);
        handleError(e);
      }
    };

    // fetch initial data
    await fetchData();
  });

  return {
    data,
    isLoading,
    isFetching,
    error,
    refresh: () => {
      if (!toValue(options.active ?? true)) {
        return Promise.resolve();
      }
      return fetchData?.();
    }
  };
};
