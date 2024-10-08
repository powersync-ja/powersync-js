import React from 'react';
import { getQueryStore } from '../QueryStore';
import { usePowerSync } from './PowerSyncContext';
import { CompilableQuery, ParsedQuery, parseQuery, SQLWatchOptions } from '@powersync/common';
import { WatchedQuery } from '../WatchedQuery';
import { QueryResult } from './useQuery';

export type SuspenseQueryResult<T> = Pick<QueryResult<T>, 'data' | 'refresh'>;

export const useSuspenseQuery = <T = any>(
  query: string | CompilableQuery<T>,
  parameters: any[] = [],
  options: Omit<SQLWatchOptions, 'signal'> = {}
): SuspenseQueryResult<T> => {
  const powerSync = usePowerSync();
  if (!powerSync) {
    throw new Error('PowerSync not configured.');
  }

  let parsedQuery: ParsedQuery;
  try {
    parsedQuery = parseQuery(query, parameters);
  } catch (error) {
    throw new Error('Failed to parse query: ' + error.message);
  }
  const key = `${parsedQuery.sqlStatement} -- ${JSON.stringify(parsedQuery.parameters)} -- ${JSON.stringify(options)}`;

  // When the component is suspended, all state is discarded. We don't get
  // any notification of that. So checkoutQuery reserves a temporary hold
  // on the query.
  // Once the component "commits", we exchange that for a permanent hold.
  const store = getQueryStore(powerSync);
  const q = store.getQuery(
    key,
    { rawQuery: query, sqlStatement: parsedQuery.sqlStatement, queryParameters: parsedQuery.parameters },
    options
  );
  const addedHoldTo = React.useRef<WatchedQuery | undefined>(undefined);
  const releaseTemporaryHold = React.useRef<(() => void) | undefined>(undefined);

  if (addedHoldTo.current !== q) {
    releaseTemporaryHold.current?.();
    releaseTemporaryHold.current = q.addTemporaryHold();
    addedHoldTo.current = q;
  }

  const [_counter, setUpdateCounter] = React.useState(0);

  React.useEffect(() => {
    const dispose = q.addListener(() => {
      setUpdateCounter((counter) => {
        return counter + 1;
      });
    });

    releaseTemporaryHold.current?.();
    releaseTemporaryHold.current = undefined;

    return dispose;
  }, []);

  if (q.currentError != null) {
    throw q.currentError;
  } else if (q.currentData != null) {
    return { data: q.currentData, refresh: () => q.fetchData() };
  } else {
    throw q.readyPromise;
  }
};
