import { type CompilableQuery } from '@powersync/common';
import { usePowerSync } from '@powersync/react';
import * as Tanstack from '@tanstack/react-query';
import { useMemo } from 'react';
import { usePowerSyncQueries } from './usePowerSyncQueries';

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

// Explicit generic typing with combine
export function useQueries<T extends readonly unknown[], TCombined>(
  options: {
    queries: readonly [...{ [K in keyof T]: PowerSyncQueryOption<T[K]> }];
    combine: (results: EnhancedExplicitQueryResults<T>) => TCombined;
  },
  queryClient?: Tanstack.QueryClient
): TCombined;

// Explicit generic typing without combine
export function useQueries<T extends readonly unknown[]>(
  options: {
    queries: readonly [...{ [K in keyof T]: PowerSyncQueryOption<T[K]> }];
    combine?: undefined;
  },
  queryClient?: Tanstack.QueryClient
): ExplicitQueryResults<T>;

// Auto inference with combine
export function useQueries<TQueries extends readonly PowerSyncQueryOption[], TCombined>(
  options: {
    queries: readonly [...TQueries];
    combine: (results: EnhancedInferQueryResults<TQueries>) => TCombined;
  },
  queryClient?: Tanstack.QueryClient
): TCombined;

// Auto inference without combine
export function useQueries<TQueries extends readonly PowerSyncQueryOption[]>(
  options: {
    queries: readonly [...TQueries];
    combine?: undefined;
  },
  queryClient?: Tanstack.QueryClient
): InferQueryResults<TQueries>;

// Implementation
export function useQueries(
  options: {
    queries: readonly (Tanstack.UseQueryOptions & PowerSyncQueryOptions<unknown>)[];
    combine?: (results: (Tanstack.UseQueryResult<unknown, unknown> & { queryKey: Tanstack.QueryKey })[]) => unknown;
  },
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
