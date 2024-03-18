import { SQLWatchOptions } from '@journeyapps/powersync-sdk-common';
import React from 'react';
import { getQueryStore } from '../QueryStore';
import { WatchedQuery } from '../WatchedQuery';
import { usePowerSync } from './PowerSyncContext';

/**
 * A hook to access the results of a watched query.
 */
export const usePowerSyncWatchedQuery = <T = any>(
  query: string,
  parameters: any[] = [],
  options: Omit<SQLWatchOptions, 'signal'> = {}
): T[] => {
  let initialResults = [];

  const powerSync = usePowerSync();
  if (!powerSync) {
    return initialResults;
  }

  // When the component is suspended, all state is discarded. We don't get
  // any notification of that. So checkoutQuery reserves a temporary hold
  // on the query.
  // Once the component "commits", we exchange that for a permanent hold.
  const store = getQueryStore(powerSync);
  const q = store.getQuery(query, parameters, options);
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
    return q.currentData;
  } else {
    throw q.readyPromise;
  }
};
