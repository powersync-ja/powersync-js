import { CompilableQuery, WatchCompatibleQuery } from '@powersync/common';
import React from 'react';
import { usePowerSync } from '../PowerSyncContext.js';
import { AdditionalOptions } from './watch-types.js';

export interface WatchCompatibleQueryWithParams<T> extends WatchCompatibleQuery<T> {
  stringifiedParameters?: string;
  stringifiedOptions: string;
}

export const constructCompatibleQuery = <RowType>(
  query: string | CompilableQuery<RowType>,
  parameters: any[] = [],
  options: AdditionalOptions
) => {
  const powerSync = usePowerSync();
  const stringifiedParameters = React.useMemo(() => JSON.stringify(parameters), [parameters]);
  const stringifiedOptions = React.useMemo(() => JSON.stringify(options), [options]);

  const parsedQuery = React.useMemo<WatchCompatibleQueryWithParams<RowType[]>>(() => {
    if (typeof query == 'string') {
      return {
        compile: () => ({
          sql: query,
          parameters
        }),
        execute: () => powerSync.getAll(query, parameters),
        // Setting this is a small optimization that avoids QueryRunner recomputing the JSON representation.
        stringifiedParameters,
        stringifiedOptions
      };
    } else {
      return {
        // Generics differ a bit but holistically this is the same
        compile: () => {
          const compiled = query.compile();
          return {
            sql: compiled.sql,
            parameters: [...compiled.parameters]
          };
        },
        execute: () => query.execute(),
        stringifiedOptions
        // Note that we can't set stringifiedParameters here because we only know parameters after the query has been
        // compiled.
      };
    }
  }, [query, powerSync, stringifiedParameters]);

  return {
    parsedQuery
  };
};
