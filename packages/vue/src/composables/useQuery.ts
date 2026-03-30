import { type CompilableQuery } from '@powersync/common';
import { computed, ref, toValue, type MaybeRef, type Ref } from 'vue';
import { AdditionalOptions, useSingleQuery } from './useSingleQuery.js';
import { useWatchedQuery } from './useWatchedQuery.js';
import { usePowerSync } from './powerSync.js';
import { useAllSyncStreamsHaveSynced } from './useAllSyncStreamsHaveSynced.js';

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

const createLoadingState = <T>(): WatchedQueryResult<T> => ({
  data: ref([]),
  isLoading: ref(true),
  isFetching: ref(true),
  error: ref(undefined),
  refresh: undefined
});

/**
 * A composable to access the results of a watched query.
 *
 * @example
 * ```vue
 * <script setup>
 * import { useQuery } from '@powersync/vue';
 *
 * const { data, isLoading, isFetching, error} = useQuery('SELECT * FROM lists');
 * </script>
 *
 * <template>
 *    <div v-if="isLoading">Loading...</div>
 *    <div v-else-if="isFetching">Updating results...</div>
 *
 *    <div v-if="error">{{ error }}</div>
 *    <ul v-else>
 *        <li v-for="l in data" :key="l.id">{{ l.name }}</li>
 *    </ul>
 * </template>
 * ```
 */
export const useQuery = <T = any>(
  query: MaybeRef<string | CompilableQuery<T>>,
  sqlParameters: MaybeRef<any[]> = [],
  options: MaybeRef<AdditionalOptions<T>> = {}
): WatchedQueryResult<T> => {
  const ps = usePowerSync();
  if (!ps) {
    const loadingState = createLoadingState<T>();
    return {
      ...loadingState,
      isLoading: ref(false),
      error: ref(new Error('PowerSync not configured.'))
    };
  }

  const { synced: streamsHaveSynced } = useAllSyncStreamsHaveSynced(
    ps,
    computed(() => toValue(options)?.streams)
  );

  const runOnce = computed(() => toValue(options)?.runQueryOnce === true);

  const single = useSingleQuery(query, sqlParameters, {
    ...toValue(options),
    active: computed(() => runOnce.value && streamsHaveSynced.value)
  });

  const watched = useWatchedQuery<T>(query, sqlParameters, {
    ...toValue(options),
    active: computed(() => !runOnce.value && streamsHaveSynced.value)
  });

  const loadingState = createLoadingState<T>();
  return {
    data: computed(() => {
      if (!streamsHaveSynced.value) return loadingState.data.value;
      return runOnce.value ? single.data.value : watched.data.value;
    }),

    isLoading: computed(() => {
      if (!streamsHaveSynced.value) return true;
      return runOnce.value ? single.isLoading.value : watched.isLoading.value;
    }),

    isFetching: computed(() => {
      if (!streamsHaveSynced.value) return false;
      return runOnce.value ? single.isFetching.value : watched.isFetching.value;
    }),

    error: computed(() => {
      if (!streamsHaveSynced.value) return undefined;
      return runOnce.value ? single.error.value : watched.error.value;
    }),

    refresh: () => {
      const currentMode = runOnce.value;
      return currentMode ? single.refresh?.() : watched.refresh?.();
    }
  };
};
