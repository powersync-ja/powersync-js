import { type CompilableQuery } from '@powersync/common';
import { type MaybeRef, type Ref } from 'vue';
import { AdditionalOptions, useSingleQuery } from './useSingleQuery';
import { useWatchedQuery } from './useWatchedQuery';

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
  /**
   * Function used to run the query again.
   */
  refresh?: () => Promise<void>;
};

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
  options: AdditionalOptions<T> = {}
): WatchedQueryResult<T> => {
  switch (true) {
    case options.runQueryOnce:
      return useSingleQuery(query, sqlParameters, options);
    default:
      return useWatchedQuery(query, sqlParameters, options);
  }
};
