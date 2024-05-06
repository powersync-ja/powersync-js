import { SQLWatchOptions } from '@powersync/common';
import { MaybeRef, Ref, ref, toValue, watchEffect } from 'vue';
import { usePowerSync } from './powerSync';

export type WatchedQueryResult<T> = {
  data: Ref<T[]>;
  /**
   * Indicates the initial loading state (hard loading). Loading becomes false once the first set of results from the watched query is available or an error occurs.
   */
  loading: Ref<boolean>;
  /**
   * Indicates whether the query is currently fetching data, is true during the initial load and any time when the query is re-evaluating (useful for large queries).
   */
  fetching: Ref<boolean>;
  error: Ref<Error>;
};

/**
 * @deprecated use {@link useQuery} instead.
 *
 * A composable to access the results of a watched query.
 */
export const usePowerSyncWatchedQuery = <T = any>(
  sqlStatement: MaybeRef<string>,
  sqlParameters: MaybeRef<any[]> = [],
  options: Omit<SQLWatchOptions, 'signal'> = {}
): WatchedQueryResult<T> => {
  const data = ref([]);
  const error = ref<Error | undefined>(undefined);

  const loading = ref(true);
  const fetching = ref(true);

  const finishLoading = () => {
    loading.value = false;
    fetching.value = false;
  };

  const powerSync = usePowerSync();

  let abortController = new AbortController();
  watchEffect(async (onCleanup) => {
    // Abort any previous watches when the effect triggers again, or when the component is unmounted
    onCleanup(() => abortController.abort());
    abortController = new AbortController();
    loading.value = true;
    fetching.value = true;

    if (!powerSync) {
      error.value = new Error('PowerSync not configured.');
      return;
    }

    const onResult = (result: T[]) => {
      finishLoading();
      data.value = result;
      error.value = undefined;
    };

    const onError = (e: Error) => {
      finishLoading();
      data.value = [];

      const wrappedError = new Error('PowerSync failed to fetch data: ' + e.message);
      wrappedError.cause = e; // Include the original error as the cause
      error.value = wrappedError;
    };

    const sql = toValue(sqlStatement);
    const parameters = toValue(sqlParameters);

    try {
      const resolvedTables = await powerSync.value.resolveTables(sql, parameters, options);

      // Fetch initial data
      const result = await powerSync.value.getAll<T>(sql, parameters);
      onResult(result);

      powerSync.value.onChangeWithCallback(
        {
          onChange: async () => {
            fetching.value = true;
            try {
              const result = await powerSync.value.getAll<T>(sql, parameters);
              onResult(result);
            } catch (error) {
              onError(error);
            }
          },
          onError
        },
        {
          ...options,
          signal: abortController.signal,
          tables: resolvedTables
        }
      );
    } catch (error) {
      onError(error);
    }
  });

  return { data, loading, fetching, error };
};
