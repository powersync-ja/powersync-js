// import { WatchedQuery } from '@powersync/common';
// import { reactive, Ref, ref, UnwrapRef, watchEffect } from 'vue';

// /**
//  * A composable to access and subscribe to the results of an existing {@link WatchedQuery} instance.
//  * @example
//  * ```vue
//  * <script setup>
//  * import { useQuery } from '@powersync/vue';
//  *
//  * const { data, isLoading, isFetching, error} = useQuery(listsQuery);
//  * </script>
//  *
//  * <template>
//  *    <div v-if="isLoading">Loading...</div>
//  *    <div v-else-if="isFetching">Updating results...</div>
//  *
//  *    <div v-if="error">{{ error }}</div>
//  *    <ul v-else>
//  *        <li v-for="l in data" :key="l.id">{{ l.name }}</li>
//  *    </ul>
//  * </template>
//  * ```
//  */
// export const useWatchedQuerySubscription = <
//   ResultType = unknown,
//   Query extends WatchedQuery<ResultType> = WatchedQuery<ResultType>
// >(
//   query: Query
// ) => {
//   const state = reactive(query.state);

//   return state;
// };
