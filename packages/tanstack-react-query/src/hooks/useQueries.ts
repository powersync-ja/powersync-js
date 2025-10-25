import { type CompilableQuery } from '@powersync/common';
import { usePowerSync } from '@powersync/react';
import * as Tanstack from '@tanstack/react-query';
import { useMemo } from 'react';
import { usePowerSyncQueries } from './usePowerSyncQueries.js';

export type PowerSyncQueryOptions<T> = {
  query?: string | CompilableQuery<T>;
  parameters?: any[];
};

export type PowerSyncQueryOption<T = unknown[]> = Tanstack.UseQueryOptions<T[]> & PowerSyncQueryOptions<T>;

export type InferQueryResults<TQueries extends readonly unknown[]> = {
  [K in keyof TQueries]: TQueries[K] extends { query: CompilableQuery<infer TData> }
    ? Tanstack.UseQueryResult<TData[]>
    : Tanstack.UseQueryResult<unknown[]>;
};

export type ExplicitQueryResults<T extends readonly unknown[]> = {
  [K in keyof T]: Tanstack.UseQueryResult<T[K][]>;
};

export type EnhancedInferQueryResults<TQueries extends readonly unknown[]> = {
  [K in keyof TQueries]: TQueries[K] extends { query: CompilableQuery<infer TData> }
    ? Tanstack.UseQueryResult<TData[]> & { queryKey: Tanstack.QueryKey }
    : Tanstack.UseQueryResult<unknown[]> & { queryKey: Tanstack.QueryKey };
};

export type EnhancedExplicitQueryResults<T extends readonly unknown[]> = {
  [K in keyof T]: Tanstack.UseQueryResult<T[K][]> & { queryKey: Tanstack.QueryKey };
};

export type UseQueriesExplicitWithCombineOptions<T extends readonly unknown[], TCombined> = {
  queries: readonly [...{ [K in keyof T]: PowerSyncQueryOption<T[K]> }];
  combine: (results: EnhancedExplicitQueryResults<T>) => TCombined;
};

export type UseQueriesExplicitWithoutCombineOptions<T extends readonly unknown[]> = {
  queries: readonly [...{ [K in keyof T]: PowerSyncQueryOption<T[K]> }];
  combine?: undefined;
};

export type UseQueriesAutoInferenceWithCombineOptions<TQueries extends readonly PowerSyncQueryOption[], TCombined> = {
  queries: readonly [...TQueries];
  combine: (results: EnhancedInferQueryResults<TQueries>) => TCombined;
};

export type UseQueriesAutoInferenceWithoutCombineOptions<TQueries extends readonly PowerSyncQueryOption[]> = {
  queries: readonly [...TQueries];
  combine?: undefined;
};

export type UseQueriesBaseOptions = {
  queries: readonly (Tanstack.UseQueryOptions & PowerSyncQueryOptions<unknown>)[];
  combine?: (results: (Tanstack.UseQueryResult<unknown, unknown> & { queryKey: Tanstack.QueryKey })[]) => unknown;
};

// Explicit generic typing with combine
export function useQueries<T extends readonly unknown[], TCombined>(
  options: UseQueriesExplicitWithCombineOptions<T, TCombined>,
  queryClient?: Tanstack.QueryClient
): TCombined;

// Explicit generic typing without combine
export function useQueries<T extends readonly unknown[]>(
  options: UseQueriesExplicitWithoutCombineOptions<T>,
  queryClient?: Tanstack.QueryClient
): ExplicitQueryResults<T>;

// Auto inference with combine
export function useQueries<TQueries extends readonly PowerSyncQueryOption[], TCombined>(
  options: UseQueriesAutoInferenceWithCombineOptions<TQueries, TCombined>,
  queryClient?: Tanstack.QueryClient
): TCombined;

// Auto inference without combine
export function useQueries<TQueries extends readonly PowerSyncQueryOption[]>(
  options: UseQueriesAutoInferenceWithoutCombineOptions<TQueries>,
  queryClient?: Tanstack.QueryClient
): InferQueryResults<TQueries>;

/**
 * @example
 * ```
 * const { data, error, isLoading } = useQueries({
 *     queries: [
 *       { queryKey: ['lists'], query: 'SELECT * from lists' },
 *       { queryKey: ['todos'], query: 'SELECT * from todos' }
 *     ],
 * })
 * ```
 *
 * @example
 * ```
 * const ids = [1, 2, 3];
 * const combinedQueries = useQueries({
 *   queries: ids.map((id) => ({
 *     queryKey: ['post', id],
 *     query: 'SELECT * from lists where id = ?',
 *     parameters: [id],
 *   })),
 *   combine: (results) => {
 *     return {
 *       data: results.map((result) => result.data),
 *       pending: results.some((result) => result.isPending),
 *     }
 *   },
 * });
 * ```
 */
export function useQueries(
  options: UseQueriesBaseOptions,
  queryClient: Tanstack.QueryClient = Tanstack.useQueryClient()
) {
  const powerSync = usePowerSync();

  if (!powerSync) {
    throw new Error('PowerSync is not available');
  }

  const queriesInput = options.queries;

  const powerSyncQueriesInput = useMemo(
    () =>
      queriesInput.map((queryOptions) => ({
        query: queryOptions.query,
        parameters: queryOptions.parameters,
        queryKey: queryOptions.queryKey
      })),
    [queriesInput]
  );

  const states = usePowerSyncQueries(powerSyncQueriesInput, queryClient);

  const queries = useMemo(() => {
    return queriesInput.map((queryOptions, idx) => {
      const { query, parameters, ...rest } = queryOptions;
      const state = states[idx];

      return {
        ...rest,
        queryFn: query ? state.queryFn : rest.queryFn,
        queryKey: rest.queryKey
      };
    });
  }, [queriesInput, states]);

  return Tanstack.useQueries(
    {
      queries: queries as Tanstack.QueriesOptions<any>,
      combine: options.combine
        ? (results) => {
            const enhancedResultsWithQueryKey = results.map((result, index) => ({
              ...result,
              queryKey: queries[index].queryKey
            }));

            return options.combine?.(enhancedResultsWithQueryKey);
          }
        : undefined
    },
    queryClient
  );
}
