import { CompilableQuery } from '@powersync/common';
import { AdditionalOptions } from '../useQuery';
import { SuspenseQueryResult, useSingleSuspenseQuery } from './useSingleSuspenseQuery';
import { useWatchedSuspenseQuery } from './useWatchedSuspenseQuery';

/**
 * A hook to access the results of a watched query that suspends until the initial result has loaded.
 * @example
 * export const ContentComponent = () => {
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
 */
export const useSuspenseQuery = <T = any>(
  query: string | CompilableQuery<T>,
  parameters: any[] = [],
  options: AdditionalOptions = {}
): SuspenseQueryResult<T> => {
  switch (options.runQueryOnce) {
    case true:
      return useSingleSuspenseQuery<T>(query, parameters, options);
    default:
      return useWatchedSuspenseQuery<T>(query, parameters, options);
  }
};
