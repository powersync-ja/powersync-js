import { type CompilableQuery } from '@powersync/common';
import { usePowerSync } from '../PowerSyncContext';
import { useSingleQuery } from './useSingleQuery';
import { useWatchedQuery } from './useWatchedQuery';
import { AdditionalOptions, DifferentialHookOptions, QueryResult, ReadonlyQueryResult } from './watch-types';
import { constructCompatibleQuery } from './watch-utils';

/**
 * A hook to access the results of a watched query.
 * @example
 *
 * export const Component = () => {
 * // The lists array here will be a new Array reference whenever a change to the
 * // lists table is made.
 * const { data: lists }  = useQuery('SELECT * from lists');
 *
 * return <View>
 *   {lists.map((l) => (
 *     <Text key={l.id}>{JSON.stringify(l)}</Text>
 *   ))}
 * </View>
 * }
 *
 * export const DiffComponent = () => {
 * // A differential query will emit results when a change to the result set occurs.
 * // The internal array object references are maintained for unchanged rows.
 * // The returned lists array is read only when a `comparator` is provided.
 * const { data: lists }  = useQuery('SELECT * from lists', [], {
 *  comparator: {
 *     keyBy: (item) => item.id,
 *     compareBy: (item) => JSON.stringify(item)
 *   }
 * });
 *
 * return <View>
 *   {lists.map((l) => (
 *     <Text key={l.id}>{JSON.stringify(l)}</Text>
 *   ))}
 * </View>
 * }
 */

export function useQuery<RowType = any>(
  query: string | CompilableQuery<RowType>,
  parameters?: any[],
  options?: AdditionalOptions
): QueryResult<RowType>;
export function useQuery<RowType = any>(
  query: string | CompilableQuery<RowType>,
  parameters?: any[],
  options?: DifferentialHookOptions<RowType>
): ReadonlyQueryResult<RowType>;
export function useQuery<RowType = any>(
  query: string | CompilableQuery<RowType>,
  parameters: any[] = [],
  options: AdditionalOptions & DifferentialHookOptions<RowType> = {}
) {
  const powerSync = usePowerSync();
  if (!powerSync) {
    return { isLoading: false, isFetching: false, data: [], error: new Error('PowerSync not configured.') };
  }
  const { parsedQuery, queryChanged } = constructCompatibleQuery(query, parameters, options);

  switch (options?.runQueryOnce) {
    case true:
      return useSingleQuery<RowType>({
        query: parsedQuery,
        powerSync,
        queryChanged
      });
    default:
      return useWatchedQuery<RowType>({
        query: parsedQuery,
        powerSync,
        queryChanged,
        options: {
          reportFetching: options.reportFetching,
          // Maintains backwards compatibility with previous versions
          // Differentiation is opt-in by default
          // We emit new data for each table change by default.
          comparator: options.comparator
        }
      });
  }
}
