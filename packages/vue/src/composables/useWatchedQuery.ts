import {
  type CompilableQuery,
  FalsyComparator,
  IncrementalWatchMode,
  ParsedQuery,
  parseQuery
} from '@powersync/common';
import { type MaybeRef, type Ref, ref, toValue, watchEffect } from 'vue';
import { usePowerSync } from './powerSync';
import { AdditionalOptions, WatchedQueryResult } from './useSingleQuery';

export const useWatchedQuery = <T = any>(
  query: MaybeRef<string | CompilableQuery<T>>,
  sqlParameters: MaybeRef<any[]> = [],
  options: AdditionalOptions<T> = {}
): WatchedQueryResult<T> => {
  const data = ref<T[]>([]) as Ref<T[]>;
  const error = ref<Error | undefined>(undefined);
  const isLoading = ref(true);
  const isFetching = ref(true);

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

  const handleError = (e: Error) => {
    finishLoading();
    data.value = [];

    const wrappedError = new Error('PowerSync failed to fetch data: ' + e.message);
    wrappedError.cause = e;
    error.value = wrappedError;
  };

  watchEffect(async (onCleanup) => {
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

    const watchedQuery = powerSync.value
      .incrementalWatch({
        mode: IncrementalWatchMode.COMPARISON
      })
      .build({
        watch: {
          placeholderData: [],
          query: {
            compile: () => ({ sql, parameters }),
            execute: async ({ db, sql, parameters }) => {
              if (typeof queryValue === 'string') {
                return db.getAll<T>(sql, parameters);
              }
              return queryValue.execute();
            }
          }
        },
        // Maintains backwards compatibility with previous versions
        comparator: options.comparator ?? FalsyComparator
      });

    const disposer = watchedQuery.subscribe({
      onStateChange: (state) => {
        isLoading.value = state.isLoading;
        isFetching.value = state.isFetching;
        data.value = state.data;
        if (state.error) {
          const wrappedError = new Error('PowerSync failed to fetch data: ' + state.error.message);
          wrappedError.cause = state.error;
          error.value = wrappedError;
        } else {
          error.value = undefined;
        }
      }
    });

    onCleanup(() => {
      disposer();
      watchedQuery.close();
    });
  });

  return {
    data,
    isLoading,
    isFetching,
    error
  };
};
