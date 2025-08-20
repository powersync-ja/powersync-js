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
  return useNullableWatchedQuerySubscription(query);
};

/**
 * @internal
 */
export const useNullableWatchedQuerySubscription = <
  ResultType = unknown,
  Query extends WatchedQuery<ResultType> = WatchedQuery<ResultType>
>(
  query: Query | null
): Query['state'] | undefined => {
  const [output, setOutputState] = React.useState(query?.state);

  // @ts-ignore: Complains about not all code paths returning a value
  React.useEffect(() => {
    if (query) {
      setOutputState(query.state);

      return query.registerListener({
        onStateChange: (state) => {
          setOutputState({ ...state });
        }
      });
    }
  }, [query]);

  return output;
};
