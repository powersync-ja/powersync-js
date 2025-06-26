import { FalsyComparator, type CompilableQuery } from '@powersync/common';
import { usePowerSync } from '../PowerSyncContext';
import { useSingleQuery } from './useSingleQuery';
import { useWatchedQuery } from './useWatchedQuery';
import { AdditionalOptions, QueryResult } from './watch-types';
import { constructCompatibleQuery } from './watch-utils';

/**
 * A hook to access the results of a watched query.
 * @example
 * export const Component = () => {
 * const { data: lists }  = useQuery('SELECT * from lists');
 *
 * return <View>
 *   {lists.map((l) => (
 *     <Text key={l.id}>{JSON.stringify(l)}</Text>
 *   ))}
 * </View>
 * }
 */
export const useQuery = <RowType = any>(
  query: string | CompilableQuery<RowType>,
  parameters: any[] = [],
  options: AdditionalOptions<RowType> = { runQueryOnce: false }
): QueryResult<RowType> => {
  const powerSync = usePowerSync();
  if (!powerSync) {
    return { isLoading: false, isFetching: false, data: [], error: new Error('PowerSync not configured.') };
  }

  const { parsedQuery, queryChanged } = constructCompatibleQuery(query, parameters, options);

  switch (options.runQueryOnce) {
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
          // Comparisons are opt-in by default
          // We emit new data for each table change by default.
          comparator: options.comparator ?? FalsyComparator
        }
      });
  }
};
