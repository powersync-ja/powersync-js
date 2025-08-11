import { AbstractPowerSyncDatabase, CompilableQuery, CompiledQuery, WatchCompatibleQuery } from '@powersync/common';
import React from 'react';
import { usePowerSync } from '../PowerSyncContext.js';
import { AdditionalOptions } from './watch-types.js';

export type InternalHookOptions<DataType> = {
  query: WatchCompatibleQuery<DataType>;
  powerSync: AbstractPowerSyncDatabase;
  queryChanged: boolean;
};

export const checkQueryChanged = <T>(query: WatchCompatibleQuery<T>, options: AdditionalOptions) => {
  let _compiled: CompiledQuery;
  try {
    _compiled = query.compile();
  } catch (error) {
    return false; // If compilation fails, we assume the query has changed
  }
  const compiled = _compiled!;

  const stringifiedParams = JSON.stringify(compiled.parameters);
  const stringifiedOptions = JSON.stringify(options);

  const previousQueryRef = React.useRef({ sqlStatement: compiled.sql, stringifiedParams, stringifiedOptions });

  if (
    previousQueryRef.current.sqlStatement !== compiled.sql ||
    previousQueryRef.current.stringifiedParams != stringifiedParams ||
    previousQueryRef.current.stringifiedOptions != stringifiedOptions
  ) {
    previousQueryRef.current.sqlStatement = compiled.sql;
    previousQueryRef.current.stringifiedParams = stringifiedParams;
    previousQueryRef.current.stringifiedOptions = stringifiedOptions;

    return true;
  }

  return false;
};

export const constructCompatibleQuery = <RowType>(
  query: string | CompilableQuery<RowType>,
  parameters: any[] = [],
  options: AdditionalOptions
) => {
  const powerSync = usePowerSync();

  const parsedQuery = React.useMemo<WatchCompatibleQuery<RowType[]>>(() => {
    if (typeof query == 'string') {
      return {
        compile: () => ({
          sql: query,
          parameters
        }),
        execute: () => powerSync.getAll(query, parameters)
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
        execute: () => query.execute()
      };
    }
  }, [query, powerSync]);

  const queryChanged = checkQueryChanged(parsedQuery, options);

  return {
    parsedQuery,
    queryChanged
  };
};
