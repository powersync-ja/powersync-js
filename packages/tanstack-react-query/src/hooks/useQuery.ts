import { type CompilableQuery } from '@powersync/common';
import { QuerySyncStreamOptions, usePowerSync } from '@powersync/react';
import * as Tanstack from '@tanstack/react-query';
import { usePowerSyncQueries } from './usePowerSyncQueries.js';

export type PowerSyncQueryOptions<T> = {
  query?: string | CompilableQuery<T>;
  parameters?: any[];
  /**
   * An optional array of sync streams (with names and parameters) backing the query.
   *
   * When set, `useQuery` will subscribe to those streams (and automatically handle unsubscribing from them, too).
   *
   * If {@link QuerySyncStreamOptions} is set on a stream, `useQuery` will remain in a loading state until that stream
   * is marked as {@link SyncSubscriptionDescription.hasSynced}. This ensures the query is not missing rows that haven't
   * been downloaded.
   * Note however that after an initial sync, the query will not block itself while new rows are downloading. Instead,
   * consistent sync snapshots will be made available as they've been processed by PowerSync.
   **/
  streams?: QuerySyncStreamOptions[];
};

export type UseBaseQueryOptions<TQueryOptions> = TQueryOptions & PowerSyncQueryOptions<any>;

/**
 *
 * Uses the `queryFn` to execute the query. No different from the base `useQuery` hook.
 *
 * @example
 * ```
 * const { data, error, isLoading } = useQuery({
 *   queryKey: ['lists'],
 *   queryFn: getTodos,
 * });
 * ```
 */
export function useQuery<TData = unknown, TError = Tanstack.DefaultError>(
  options: UseBaseQueryOptions<Tanstack.UseQueryOptions<TData, TError>> & { query?: undefined },
  queryClient?: Tanstack.QueryClient
): Tanstack.UseQueryResult<TData, TError>;

/**
 *
 * Uses the `query` to execute the PowerSync query.
 *
 * @example
 * ```
 * const { data, error, isLoading } = useQuery({
 *   queryKey: ['lists'],
 *   query: 'SELECT * from lists where id = ?',
 *   parameters: ['id-1']
 * });
 * ```
 *
 * @example
 * ```
 * const { data, error, isLoading } = useQuery({
 *   queryKey: ['lists'],
 *   query: compilableQuery,
 * });
 * ```
 */
export function useQuery<TData = unknown, TError = Tanstack.DefaultError>(
  options: UseBaseQueryOptions<Tanstack.UseQueryOptions<TData[], TError>> & { query: string | CompilableQuery<TData> },
  queryClient?: Tanstack.QueryClient
): Tanstack.UseQueryResult<TData[], TError>;

export function useQuery<TData = unknown, TError = Tanstack.DefaultError>(
  options: UseBaseQueryOptions<Tanstack.UseQueryOptions<TData, TError>>,
  queryClient: Tanstack.QueryClient = Tanstack.useQueryClient()
) {
  return useQueryCore(options, queryClient, Tanstack.useQuery);
}

/**
 *
 * Uses the `queryFn` to execute the query. No different from the base `useSuspenseQuery` hook.
 *
 * @example
 * ```
 * const { data } = useSuspenseQuery({
 *   queryKey: ['lists'],
 *   queryFn: getTodos,
 * });
 * ```
 */
export function useSuspenseQuery<TData = unknown, TError = Tanstack.DefaultError>(
  options: UseBaseQueryOptions<Tanstack.UseSuspenseQueryOptions<TData, TError>> & { query?: undefined },
  queryClient?: Tanstack.QueryClient
): Tanstack.UseSuspenseQueryResult<TData, TError>;

/***
 *
 * Uses the `query` to execute the PowerSync query.
 *
 * @example
 * ```
 * const { data } = useSuspenseQuery({
 *   queryKey: ['lists'],
 *   query: 'SELECT * from lists where id = ?',
 *   parameters: ['id-1']
 * });
 * ```
 */
export function useSuspenseQuery<TData = unknown, TError = Tanstack.DefaultError>(
  options: UseBaseQueryOptions<Tanstack.UseSuspenseQueryOptions<TData[], TError>> & {
    query: string | CompilableQuery<TData>;
  },
  queryClient?: Tanstack.QueryClient
): Tanstack.UseSuspenseQueryResult<TData[], TError>;

export function useSuspenseQuery<TData = unknown, TError = Tanstack.DefaultError>(
  options: UseBaseQueryOptions<Tanstack.UseSuspenseQueryOptions<TData, TError>>,
  queryClient: Tanstack.QueryClient = Tanstack.useQueryClient()
) {
  return useQueryCore(options, queryClient, Tanstack.useSuspenseQuery);
}

function useQueryCore<
  TData,
  TError,
  TQueryOptions extends Tanstack.UseQueryOptions<TData, TError> | Tanstack.UseSuspenseQueryOptions<TData, TError>,
  TQueryResult extends Tanstack.UseQueryResult<TData, TError> | Tanstack.UseSuspenseQueryResult<TData, TError>
>(
  options: UseBaseQueryOptions<TQueryOptions>,
  queryClient: Tanstack.QueryClient,
  useQueryFn: (options: TQueryOptions, queryClient?: Tanstack.QueryClient) => TQueryResult
): TQueryResult {
  const powerSync = usePowerSync();

  if (!powerSync) {
    throw new Error('PowerSync is not available');
  }

  const { query, parameters, queryKey, streams, ...resolvedOptions } = options;

  const { queries: [{ queryFn }], streamsHaveSynced } = usePowerSyncQueries(
    [
      {
        query,
        parameters,
        queryKey,
        streams
      }
    ],
    queryClient
  );

  return useQueryFn(
    {
      ...(resolvedOptions as TQueryOptions),
      queryKey,
      queryFn: query ? queryFn : resolvedOptions.queryFn,
      enabled: streamsHaveSynced
    } as TQueryOptions,
    queryClient
  );
}
