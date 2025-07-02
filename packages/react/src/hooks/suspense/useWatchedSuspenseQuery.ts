import { CompilableQuery } from '@powersync/common';
import { generateQueryKey, getQueryStore } from '../../QueryStore';
import { usePowerSync } from '../PowerSyncContext';
import { AdditionalOptions } from '../watched/watch-types';
import { constructCompatibleQuery } from '../watched/watch-utils';
import { SuspenseQueryResult } from './SuspenseQueryResult';
import { useWatchedQuerySuspenseSubscription } from './useWatchedQuerySuspenseSubscription';

export const useWatchedSuspenseQuery = <T = any>(
  query: string | CompilableQuery<T>,
  parameters: any[] = [],
  options: AdditionalOptions = {}
): SuspenseQueryResult<T> => {
  const powerSync = usePowerSync();
  if (!powerSync) {
    throw new Error('PowerSync not configured.');
  }

  // Note, we don't need to check if the query changed since we fetch the WatchedQuery
  // from the store given these query params
  const { parsedQuery } = constructCompatibleQuery(query, parameters, options);
  const { sql: parsedSql, parameters: parsedParameters } = parsedQuery.compile();

  const key = generateQueryKey(parsedSql, parsedParameters, options);

  // When the component is suspended, all state is discarded. We don't get
  // any notification of that. So checkoutQuery reserves a temporary hold
  // on the query.
  // Once the component "commits", we exchange that for a permanent hold.
  const store = getQueryStore(powerSync);
  const watchedQuery = store.getQuery(key, parsedQuery, options);

  return useWatchedQuerySuspenseSubscription(watchedQuery);
};
