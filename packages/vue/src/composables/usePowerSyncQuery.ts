import { MaybeRef, Ref, ref, toValue, watch } from 'vue';
import { usePowerSync } from './powerSync';

export type QueryOptions = {
  /**
   * Whether to watch the parameters for changes, any detected changes will cause the query to re-execute.
   * Default is true.
   */
  watchParameters: boolean;

  /**
   * Whether to execute the query immediately when the composable is invoked.
   * Default is true.
   */
  immediate: boolean;
};
export type Result<T> = { data: Ref<T[]>; loading: Ref<boolean>; error: Ref<Error>; refresh: () => Promise<void> };

/**
 * @deprecated use {@link useQuery} instead.
 *
 * A composable to access a single static query.
 * SQL Statement and query Parameters are watched by default.
 * For a result that updates as the source data changes, use {@link usePowerSyncWatchedQuery} instead.
 */
export const usePowerSyncQuery = <T = any>(
  sqlStatement: MaybeRef<string>,
  parameters: MaybeRef<any[]> = [],
  queryOptions: QueryOptions = { watchParameters: true, immediate: true }
): Result<T> => {
  const data = ref([]);
  const loading = ref<boolean>(false);
  const error = ref<Error | undefined>(undefined);

  const powerSync = usePowerSync();

  const fetchData = async () => {
    if (!powerSync) {
      error.value = new Error('PowerSync not configured.');
      return;
    }

    try {
      error.value = undefined;
      loading.value = true;

      data.value = await powerSync.value.getAll(toValue(sqlStatement), toValue(parameters));
    } catch (e) {
      data.value = [];

      const wrappedError = new Error('PowerSync failed to fetch data: ' + e.message);
      wrappedError.cause = e;
      error.value = wrappedError;
    } finally {
      loading.value = false;
    }
  };

  if (queryOptions.watchParameters) {
    watch([powerSync, ref(sqlStatement), ref(parameters)], fetchData);
  }

  if (queryOptions.immediate) {
    fetchData();
  }

  return { data, loading, error, refresh: fetchData };
};
