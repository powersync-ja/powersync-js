import { type CompilableQuery, parseQuery } from '@powersync/common';
import { usePowerSync } from '@powersync/react';
import * as Tanstack from '@tanstack/react-query';
import { useEffect, useMemo, useState, useCallback } from 'react';

export type PowerSyncQueryOptions<T> = {
  query?: string | CompilableQuery<T>;
  parameters?: any[];
};

export type PowerSyncQueryOption<T = unknown[]> = Tanstack.UseQueryOptions<T[]> & PowerSyncQueryOptions<T>;

export type InferQueryResults<TQueries extends readonly unknown[]> = {
  [K in keyof TQueries]: TQueries[K] extends { query: CompilableQuery<infer TData> }
    ? Tanstack.UseQueryResult<TData[]>
    : Tanstack.UseQueryResult<unknown[]>;
};

export type ExplicitQueryResults<T extends readonly unknown[]> = {
  [K in keyof T]: Tanstack.UseQueryResult<T[K][]>;
};

export type EnhancedInferQueryResults<TQueries extends readonly unknown[]> = {
  [K in keyof TQueries]: TQueries[K] extends { query: CompilableQuery<infer TData> }
    ? Tanstack.UseQueryResult<TData[]> & { queryKey: Tanstack.QueryKey }
    : Tanstack.UseQueryResult<unknown[]> & { queryKey: Tanstack.QueryKey };
};

export type EnhancedExplicitQueryResults<T extends readonly unknown[]> = {
  [K in keyof T]: Tanstack.UseQueryResult<T[K][]> & { queryKey: Tanstack.QueryKey };
};

// Explicit generic typing with combine
export function useQueries<T extends readonly unknown[], TCombined>(
  options: {
    queries: readonly [...{ [K in keyof T]: PowerSyncQueryOption<T[K]> }];
    combine: (results: EnhancedExplicitQueryResults<T>) => TCombined;
  },
  queryClient?: Tanstack.QueryClient
): TCombined;

// Explicit generic typing without combine
export function useQueries<T extends readonly unknown[]>(
  options: {
    queries: readonly [...{ [K in keyof T]: PowerSyncQueryOption<T[K]> }];
    combine?: undefined;
  },
  queryClient?: Tanstack.QueryClient
): ExplicitQueryResults<T>;

// Auto inference with combine
export function useQueries<TQueries extends readonly PowerSyncQueryOption[], TCombined>(
  options: {
    queries: readonly [...TQueries];
    combine: (results: EnhancedInferQueryResults<TQueries>) => TCombined;
  },
  queryClient?: Tanstack.QueryClient
): TCombined;

// Auto inference without combine
export function useQueries<TQueries extends readonly PowerSyncQueryOption[]>(
  options: {
    queries: readonly [...TQueries];
    combine?: undefined;
  },
  queryClient?: Tanstack.QueryClient
): InferQueryResults<TQueries>;

// Implementation
export function useQueries(
  options: {
    queries: readonly (Tanstack.UseQueryOptions & PowerSyncQueryOptions<unknown>)[];
    combine?: (results: (Tanstack.UseQueryResult<unknown, unknown> & { queryKey: Tanstack.QueryKey })[]) => unknown;
  },
  queryClient: Tanstack.QueryClient = Tanstack.useQueryClient()
) {
  const powerSync = usePowerSync();
  const queriesInput = options.queries;
  const [tablesArr, setTablesArr] = useState<string[][]>(() => queriesInput.map(() => []));
  const [errorsArr, setErrorsArr] = useState<(Error | undefined)[]>(() => queriesInput.map(() => undefined));

  const updateTablesArr = useCallback((tables: string[], idx: number) => {
    setTablesArr((prev) => {
      if (JSON.stringify(prev[idx]) === JSON.stringify(tables)) return prev;
      const next = [...prev];
      next[idx] = tables;
      return next;
    });
  }, []);

  const updateErrorsArr = useCallback((error: Error, idx: number) => {
    setErrorsArr((prev) => {
      if (prev[idx]?.message === error.message) return prev;
      const next = [...prev];
      next[idx] = error;
      return next;
    });
  }, []);

  const parsedQueries = useMemo(
    () =>
      queriesInput.map((queryOptions) => {
        const { query, parameters = [], ...rest } = queryOptions;
        const parsed = (() => {
          if (!query) {
            return { sqlStatement: '', queryParameters: [], error: undefined };
          }

          try {
            const parsedQuery = parseQuery(query, parameters);
            return {
              sqlStatement: parsedQuery.sqlStatement,
              queryParameters: parsedQuery.parameters,
              error: undefined
            };
          } catch (e) {
            return {
              sqlStatement: '',
              queryParameters: [],
              error: e as Error
            };
          }
        })();

        return { query, parameters, rest, ...parsed };
      }),
    [queriesInput]
  );

  const stringifiedQueriesDeps = JSON.stringify(
    parsedQueries.map((q) => ({
      sql: q.sqlStatement,
      params: q.queryParameters
    }))
  );

  useEffect(() => {
    const listeners = parsedQueries.map((q, idx) => {
      if (q.error || !q.query) {
        return null;
      }

      (async () => {
        try {
          const t = await powerSync.resolveTables(q.sqlStatement, q.queryParameters);
          updateTablesArr(t, idx);
        } catch (e) {
          updateErrorsArr(e, idx);
        }
      })();
      return powerSync.registerListener({
        schemaChanged: async () => {
          try {
            const t = await powerSync.resolveTables(q.sqlStatement, q.queryParameters);
            updateTablesArr(t, idx);
            queryClient.invalidateQueries({ queryKey: q.rest.queryKey });
          } catch (e) {
            updateErrorsArr(e, idx);
          }
        }
      });
    });

    return () => {
      listeners.forEach((l) => l?.());
    };
  }, [powerSync, queryClient, stringifiedQueriesDeps, updateErrorsArr, updateTablesArr]);

  const stringifiedQueryKeys = JSON.stringify(parsedQueries.map((q) => q.rest.queryKey));

  useEffect(() => {
    const aborts = parsedQueries.map((q, idx) => {
      if (q.error || !q.query) {
        return null;
      }

      const abort = new AbortController();

      powerSync.onChangeWithCallback(
        {
          onChange: () => {
            queryClient.invalidateQueries({ queryKey: q.rest.queryKey });
          },
          onError: (e) => {
            updateErrorsArr(e, idx);
          }
        },
        {
          tables: tablesArr[idx],
          signal: abort.signal
        }
      );
      return abort;
    });
    return () => aborts.forEach((a) => a?.abort());
  }, [powerSync, queryClient, tablesArr, updateErrorsArr, stringifiedQueryKeys]);

  const queries = useMemo(() => {
    return parsedQueries.map((q, idx) => {
      const error = q.error || errorsArr[idx];
      const queryFn = async () => {
        if (error) throw error;

        try {
          return typeof q.query === 'string' ? powerSync.getAll(q.sqlStatement, q.queryParameters) : q.query?.execute();
        } catch (e) {
          throw e;
        }
      };
      return {
        ...q.rest,
        queryFn: q.query ? queryFn : q.rest.queryFn,
        queryKey: q.rest.queryKey
      };
    });
  }, [stringifiedQueriesDeps, errorsArr]);

  return Tanstack.useQueries(
    {
      queries: queries as Tanstack.QueriesOptions<any>,
      combine: options.combine
        ? (results) => {
            const enhancedResultsWithQueryKey = results.map((result, index) => ({
              ...result,
              queryKey: queries[index].queryKey
            }));

            return options.combine?.(enhancedResultsWithQueryKey);
          }
        : undefined
    },
    queryClient
  );
}
