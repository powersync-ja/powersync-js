import { type CompilableQuery, ParsedQuery, parseQuery, WatchCompatibleQuery } from '@powersync/common';
import { type MaybeRef, type Ref, ref, toValue, watchEffect } from 'vue';
import { usePowerSync } from './powerSync.js';
import { AdditionalOptions, WatchedQueryResult } from './useSingleQuery.js';

export const useWatchedQuery = <T = any>(
  query: MaybeRef<string | CompilableQuery<T>>,
  sqlParameters: MaybeRef<any[]> = [],
  options: AdditionalOptions<T> = {}
): WatchedQueryResult<T> => {
  const data = ref<ReadonlyArray<Readonly<T>>>([]) as Ref<ReadonlyArray<Readonly<T>>>;
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

    const compatibleQuery: WatchCompatibleQuery<T[]> = {
      compile: () => ({ sql, parameters }),
      execute: async ({ db, sql, parameters }) => {
        if (typeof queryValue === 'string') {
          return db.getAll<T>(sql, parameters);
        }
        return queryValue.execute();
      }
    };

    const watch = options.rowComparator
      ? powerSync.value.customQuery(compatibleQuery).differentialWatch({
          rowComparator: options.rowComparator,
          throttleMs: options.throttleMs
        })
      : powerSync.value.customQuery(compatibleQuery).watch({
          throttleMs: options.throttleMs
        });

    const disposer = watch.registerListener({
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
      watch.close();
    });
  });

  return {
    data,
    isLoading,
    isFetching,
    error
  };
};
