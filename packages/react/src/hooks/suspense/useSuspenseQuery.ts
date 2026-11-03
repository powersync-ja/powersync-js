import { CompilableQuery } from '@powersync/common';
import { useContext, useMemo, useSyncExternalStore } from 'react';
import { PowerSyncContext } from '../PowerSyncContext.js';
import { configError, configKey, resolveConfig } from '../watched/QueryRunner.js';
import { DifferentialSuspenseQueryOptions, SuspenseQueryOptions } from '../watched/watch-types.js';
import { constructCompatibleQuery } from '../watched/watch-utils.js';
import { getSuspenseQueryCache } from './SuspenseQueryCache.js';
import { ReadonlySuspenseQueryResult, SuspenseQueryResult } from './SuspenseQueryResult.js';

/**
 * A hook to access the results of a watched query that suspends until the initial result has loaded.
 * @example
 * export const ContentComponent = () => {
 * // The lists array here will be a new Array reference whenever a change to the
 * // lists table is made.
 * const { data: lists }  = useSuspenseQuery('SELECT * from lists');
 *
 * return <View>
 *   {lists.map((l) => (
 *     <Text key={l.id}>{JSON.stringify(l)}</Text>
 *   ))}
 * </View>;
 * }
 *
 * export const DisplayComponent = () => {
 * return (
 *    <Suspense fallback={<div>Loading content...</div>}>
 *       <ContentComponent />
 *    </Suspense>
 * );
 * }
 *
 * export const DiffContentComponent = () => {
 * // A differential query will emit results when a change to the result set occurs.
 * // The internal array object references are maintained for unchanged rows.
 * // The returned lists array is read only when a `rowComparator` is provided.
 * const { data: lists }  = useSuspenseQuery('SELECT * from lists', [], {
 *  rowComparator: {
 *     keyBy: (item) => item.id,
 *     compareBy: (item) => JSON.stringify(item)
 *   }
 * });
 * return <View>
 *   {lists.map((l) => (
 *     <Text key={l.id}>{JSON.stringify(l)}</Text>
 *   ))}
 * </View>;
 * }
 *
 * export const DisplayComponent = () => {
 * return (
 *    <Suspense fallback={<div>Loading content...</div>}>
 *       <ContentComponent />
 *    </Suspense>
 * );
 * }
 */
export function useSuspenseQuery<RowType = any>(
  query: string | CompilableQuery<RowType>,
  parameters?: any[],
  options?: SuspenseQueryOptions
): SuspenseQueryResult<RowType>;
export function useSuspenseQuery<RowType = any>(
  query: string | CompilableQuery<RowType>,
  parameters?: any[],
  options?: DifferentialSuspenseQueryOptions<RowType>
): ReadonlySuspenseQueryResult<RowType>;
export function useSuspenseQuery<RowType = any>(
  query: string | CompilableQuery<RowType>,
  parameters: any[] = [],
  options: SuspenseQueryOptions & DifferentialSuspenseQueryOptions<RowType> = {}
): SuspenseQueryResult<RowType> | ReadonlySuspenseQueryResult<RowType> {
  const powerSync = useContext(PowerSyncContext);
  const parsedQuery = constructCompatibleQuery(query, parameters);
  const config = resolveConfig(
    powerSync,
    parsedQuery,
    options,
    // We currently don't support sync streams here (useAllStreamsHaveSynced relies on useEffect, which don't fire in
    // suspended components).
    true
  );
  if (config.kind != 'query') {
    // Missing database or a query that failed to compile, report.
    throw configError(config);
  }

  // A component that suspends before its first commit loses all its state, so the runner for this query is stored in
  // a cache shared between components instead of in a ref.
  const cache = getSuspenseQueryCache(config.db);
  const key = configKey(config);
  const suspenseQuery = useMemo(() => cache.query(key, config), [cache, key]);
  suspenseQuery.markUsed();
  const result = useSyncExternalStore(suspenseQuery.subscribe, suspenseQuery.getSnapshot, suspenseQuery.getSnapshot);

  if (result.error != null) {
    throw result.error;
  } else if (result.isLoading) {
    throw suspenseQuery.waitForLoaded();
  }

  return { data: result.data as RowType[], refresh: result.refresh };
}
