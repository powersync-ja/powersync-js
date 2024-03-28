import { MaybeRef, Ref, ref, toValue, watch } from 'vue';
import { usePowerSync } from './powerSync';

export type QueryOptions = { watchParameters: boolean, immediate: boolean };
export type QueryResult<T> = { data: Ref<T[]>, loading: Ref<boolean>, error: Ref<Error>, refresh: () => Promise<void> };

/**
 * A composable to access a single static query.
 * SQL Statement and query Parameters are watched by default.
 * For a result that updates as the source data changes, use {@link usePowerSyncWatchedQuery} instead.
 */
export const usePowerSyncQuery = <T = any>(sqlStatement: MaybeRef<string>, parameters: MaybeRef<any[]> = [], queryOptions: QueryOptions = { watchParameters: true, immediate: true }): QueryResult<T> => {
    const data = ref([]);
    const loading = ref<boolean>(false);
    const error = ref<Error>(undefined);

    const powerSync = usePowerSync();

    const fetchData = async () => {
        if (!powerSync) {
            error.value = new Error('PowerSync not configured.')
            return;
        };

        try {
            error.value = undefined;
            loading.value = true;

            await powerSync.value.readLock(async (tx) => {
                const result = await tx.getAll(toValue(sqlStatement), toValue(parameters));
                data.value = result;
            });
        } catch (e) {
            data.value = [];

            const wrappedError = new Error('PowerSync failed to fetch data: ' + e.message);
            wrappedError.cause = e; // Include the original error as the cause
            error.value = wrappedError;
        } finally {
            loading.value = false;
        }
    };

    if (queryOptions.watchParameters) {
        watch([powerSync, ref(sqlStatement), ref(parameters)], fetchData)
    }
    if (queryOptions.immediate) {
        fetchData();
    }

    return { data, loading, error, refresh: fetchData };
};