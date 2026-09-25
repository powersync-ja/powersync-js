import { AbstractPowerSyncDatabase, CompilableQuery, CompiledQuery, WatchCompatibleQuery } from '@powersync/common';
import React from 'react';
import { usePowerSync } from '../PowerSyncContext.js';
import { AdditionalOptions } from './watch-types.js';

export type InternalHookOptions<DataType> = {
  query: WatchCompatibleQuery<DataType>;
  powerSync: AbstractPowerSyncDatabase;
  queryChanged: boolean;
  active: boolean;
};

interface WatchCompatibleQueryWithParams<T> extends WatchCompatibleQuery<T> {
  stringifiedParameters?: string;
}

interface ObservedQueryState {
  sqlStatement: string;
  stringifiedParams: string;
  stringifiedOptions: string;
}

export const checkQueryChanged = <T>(query: WatchCompatibleQueryWithParams<T>, options: AdditionalOptions) => {
  /**
   * The query state which was observed during the previous render.
   *  - `undefined` indicates the initial render, no query has been observed yet.
   *  - `null` indicates that the previous render could not compile the query.
   *
   * This ref is declared before compiling the query. Compilation can throw, and a hook may never
   * be declared after a conditional return - doing so changes the order of hooks between renders,
   * which crashes the component.
   */
  const previousQueryRef = React.useRef<ObservedQueryState | null | undefined>(undefined);
  const isInitialRender = previousQueryRef.current === undefined;

  let compiled: CompiledQuery;
  try {
    compiled = query.compile();
  } catch (error) {
    // If compilation fails we can't compare anything. Record the failure so that a subsequent
    // successful compilation is reported as a change: consumers are still using the query which
    // could not be compiled.
    previousQueryRef.current = null;
    return false;
  }

  const stringifiedParams = query.stringifiedParameters ?? JSON.stringify(compiled.parameters);
  const stringifiedOptions = JSON.stringify(options);

  const previousQuery = previousQueryRef.current;

  if (
    previousQuery == null ||
    previousQuery.sqlStatement !== compiled.sql ||
    previousQuery.stringifiedParams != stringifiedParams ||
    previousQuery.stringifiedOptions != stringifiedOptions
  ) {
    previousQueryRef.current = { sqlStatement: compiled.sql, stringifiedParams, stringifiedOptions };

    // The initial render is never a change: the query has not been used anywhere yet.
    return !isInitialRender;
  }

  return false;
};

export const constructCompatibleQuery = <RowType>(
  query: string | CompilableQuery<RowType>,
  parameters: any[] = [],
  options: AdditionalOptions
) => {
  const powerSync = usePowerSync()!;
  const stringifiedParameters = React.useMemo(() => JSON.stringify(parameters), [parameters]);

  const parsedQuery = React.useMemo<WatchCompatibleQueryWithParams<RowType[]>>(() => {
    if (typeof query == 'string') {
      return {
        compile: () => ({
          sql: query,
          parameters
        }),
        execute: () => powerSync.getAll(query, parameters),
        // Setting this is a small optimization that avoids checkQueryChanged recomputing the JSON representation.
        stringifiedParameters
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
        // Note that we can't set stringifiedParameters here because we only know parameters after the query has been
        // compiled.
      };
    }
  }, [query, powerSync, stringifiedParameters]);

  const queryChanged = checkQueryChanged(parsedQuery, options);

  return {
    parsedQuery,
    queryChanged
  };
};
