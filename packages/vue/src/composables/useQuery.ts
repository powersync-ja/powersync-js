import { type SQLWatchOptions } from '@powersync/common';
import { type MaybeRef, type Ref, ref, toValue, watchEffect } from 'vue';
import { usePowerSync } from './powerSync';

interface AdditionalOptions extends Omit<SQLWatchOptions, 'signal'> {
  runQueryOnce?: boolean;
}

export type WatchedQueryResult<T> = {
  data: Ref<T[]>;
  /**
   * Indicates the initial loading state (hard loading). Loading becomes false once the first set of results from the watched query is available or an error occurs.
   */
  isLoading: Ref<boolean>;
  /**
   * Indicates whether the query is currently fetching data, is true during the initial load and any time when the query is re-evaluating (useful for large queries).
   */
  isFetching: Ref<boolean>;
  error: Ref<Error | undefined>;
};

/**
 * A composable to access the results of a watched query.
 */
export const useQuery = <T = any>(
  sqlStatement: MaybeRef<string>,
  sqlParameters: MaybeRef<any[]> = [],
  options: AdditionalOptions = {}
): WatchedQueryResult<T> => {
  const data = ref<T[]>([]) as Ref<T[]>;
  const error = ref<Error | undefined>(undefined);
  const isLoading = ref(true);
  const isFetching = ref(true);

  const powerSync = usePowerSync();

  const finishLoading = () => {
    isLoading.value = false;
    isFetching.value = false;
  };

  if (!powerSync) {
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
    finishLoading();
    data.value = [];

    const wrappedError = new Error('PowerSync failed to fetch data: ' + e.message);
    wrappedError.cause = e;
    error.value = wrappedError;
  };

  let abortController = new AbortController();
  watchEffect(async (onCleanup) => {
    // Abort any previous watches when the effect triggers again, or when the component is unmounted
    onCleanup(() => abortController.abort());
    abortController = new AbortController();
    isLoading.value = true;
    isFetching.value = true;

    const sql = toValue(sqlStatement);
    const parameters = toValue(sqlParameters);

    try {
      const resolvedTables = await powerSync.value.resolveTables(sql, parameters, options);

      // Fetch initial data
      const result = await powerSync.value.getAll<T>(sql, parameters);
      handleResult(result);

      if (options.runQueryOnce) {
        return;
      }

      powerSync.value.onChangeWithCallback(
        {
          onChange: async () => {
            isFetching.value = true;
            try {
              const result = await powerSync.value.getAll<T>(sql, parameters);
              handleResult(result);
            } catch (error) {
              handleError(error);
            }
          },
          onError: handleError
        },
        {
          ...options,
          signal: abortController.signal,
          tables: resolvedTables
        }
      );
    } catch (error) {
      handleError(error);
    }
  });

  return { data, isLoading, isFetching, error };
};
