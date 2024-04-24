import { SQLWatchOptions } from '@powersync/common';
import React from 'react';
import { usePowerSync } from './PowerSyncContext';

/**
 * @deprecated use {@link useQuery} instead.
 *
 * A hook to access the results of a watched query.
 * @example
 * export const Component = () => {
 * const lists = usePowerSyncWatchedQuery('SELECT * from lists');
 *
 * return <View>
 *   {lists.map((l) => (
 *     <Text key={l.id}>{JSON.stringify(l)}</Text>
 *   ))}
 * </View>
 * }
 */
export const usePowerSyncWatchedQuery = <T = any>(
  sqlStatement: string,
  parameters: any[] = [],
  options: Omit<SQLWatchOptions, 'signal'> = {}
): T[] => {
  const powerSync = usePowerSync();
  if (!powerSync) {
    return [];
  }

  const memoizedParams = React.useMemo(() => parameters, [...parameters]);
  const memoizedOptions = React.useMemo(() => options, [JSON.stringify(options)]);
  const [data, setData] = React.useState<T[]>([]);
  const abortController = React.useRef(new AbortController());

  React.useEffect(() => {
    // Abort any previous watches
    abortController.current?.abort();
    abortController.current = new AbortController();

    powerSync.watch(
      sqlStatement,
      parameters,
      {
        onResult(results) {
          setData(results.rows?._array ?? []);
        }
      },
      {
        ...options,
        signal: abortController.current.signal
      }
    );

    return () => {
      abortController.current?.abort();
    };
  }, [powerSync, sqlStatement, memoizedParams, memoizedOptions]);

  return data;
};
