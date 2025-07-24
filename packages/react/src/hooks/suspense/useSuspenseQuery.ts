import { CompilableQuery } from '@powersync/common';
import { AdditionalOptions, DifferentialHookOptions } from '../watched/watch-types';
import { ReadonlySuspenseQueryResult, SuspenseQueryResult } from './SuspenseQueryResult';
import { useSingleSuspenseQuery } from './useSingleSuspenseQuery';
import { useWatchedSuspenseQuery } from './useWatchedSuspenseQuery';

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
 * // The returned lists array is read only when a `comparator` is provided.
 * const { data: lists }  = useSuspenseQuery('SELECT * from lists', [], {
 *  comparator: {
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
  options?: AdditionalOptions
): SuspenseQueryResult<RowType>;
export function useSuspenseQuery<RowType = any>(
  query: string | CompilableQuery<RowType>,
  paramerers?: any[],
  options?: DifferentialHookOptions<RowType>
): ReadonlySuspenseQueryResult<RowType>;
export function useSuspenseQuery<RowType = any>(
  query: string | CompilableQuery<RowType>,
  parameters: any[] = [],
  options: AdditionalOptions & DifferentialHookOptions<RowType> = {}
) {
  switch (options?.runQueryOnce) {
    case true:
      return useSingleSuspenseQuery<RowType>(query, parameters, options);
    default:
      return useWatchedSuspenseQuery<RowType>(query, parameters, options);
  }
}
