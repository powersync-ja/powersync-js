import { WatchedQuery } from '@powersync/common';
import React from 'react';

/**
 * A hook to access and subscribe to the results of an existing {@link WatchedQuery} instance.
 * @example
 * export const ContentComponent = () => {
 * const { data: lists }  = useWatchedQuerySubscription(listsQuery);
 *
 * return <View>
 *   {lists.map((l) => (
 *     <Text key={l.id}>{JSON.stringify(l)}</Text>
 *   ))}
 * </View>;
 * }
 *
 */
export const useWatchedQuerySubscription = <
  ResultType = unknown,
  Query extends WatchedQuery<ResultType> = WatchedQuery<ResultType>
>(
  query: Query
): Query['state'] => {
  const [output, setOutputState] = React.useState(query.state);

  React.useEffect(() => {
    const dispose = query.registerListener({
      onStateChange: (state) => {
        setOutputState({ ...state });
      }
    });

    return () => {
      dispose();
    };
  }, [query]);

  return output;
};
