import { type CompilableQuery, parseQuery } from '@powersync/common';
import { usePowerSync } from '@powersync/react';
import * as Tanstack from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';

export type PowerSyncQueryOptions<T> = {
    query?: string | CompilableQuery<T>;
    parameters?: any[];
};

export type UseBaseQueryOptions<TQueryOptions> = TQueryOptions & PowerSyncQueryOptions<any>;

export type PowerSyncQueriesOptions<T extends any[]> = {
    [K in keyof T]: Tanstack.UseQueryOptions<T[K], any> & PowerSyncQueryOptions<T[K]>;
};

type PowerSyncQueryOption<T = any> = Tanstack.UseQueryOptions<T[], any> & PowerSyncQueryOptions<T>;

type InferQueryResults<TQueries extends readonly any[]> = {
    [K in keyof TQueries]: TQueries[K] extends { query: CompilableQuery<infer TData> }
        ? Tanstack.UseQueryResult<TData[], any>
        : Tanstack.UseQueryResult<unknown[], any>;
};

type ExplicitQueryResults<T extends readonly any[]> = {
    [K in keyof T]: Tanstack.UseQueryResult<T[K][], any>;
};

type EnhancedInferQueryResults<TQueries extends readonly any[]> = {
    [K in keyof TQueries]: TQueries[K] extends { query: CompilableQuery<infer TData> }
        ? Tanstack.UseQueryResult<TData[], any> & { queryKey: Tanstack.QueryKey }
        : Tanstack.UseQueryResult<unknown[], any> & { queryKey: Tanstack.QueryKey };
};

type EnhancedExplicitQueryResults<T extends readonly any[]> = {
    [K in keyof T]: Tanstack.UseQueryResult<T[K][], any> & { queryKey: Tanstack.QueryKey };
};

// Explicit generic typing with combine
export function useQueries<T extends readonly any[], TCombined>(
    options: {
        queries: readonly [...{ [K in keyof T]: PowerSyncQueryOption<T[K]> }];
        combine: (results: EnhancedExplicitQueryResults<T>) => TCombined;
    },
    queryClient?: Tanstack.QueryClient
): TCombined;

// Explicit generic typing without combine
export function useQueries<T extends readonly any[]>(
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
        queries: readonly (Tanstack.UseQueryOptions<any, any> & PowerSyncQueryOptions<any>)[];
        combine?: (results: (Tanstack.UseQueryResult<any, any> & { queryKey: Tanstack.QueryKey })[]) => any;
    },
    queryClient: Tanstack.QueryClient = Tanstack.useQueryClient()
) {
    const powerSync = usePowerSync();
    const queriesInput = options.queries;
    const [tablesArr, setTablesArr] = useState<string[][]>(() => queriesInput.map(() => []));
    const [errorsArr, setErrorsArr] = useState<(Error | undefined)[]>(() => queriesInput.map(() => undefined));

    const parsedQueries = useMemo(() => {
        return queriesInput.map((queryOptions: Tanstack.UseQueryOptions<any, any> & PowerSyncQueryOptions<any>) => {
            const { query, parameters = [], ...rest } = queryOptions;
            let sqlStatement = '';
            let queryParameters: any[] = [];
            let error: Error | undefined = undefined;
            if (query) {
                try {
                    const parsedQuery = parseQuery(query, parameters);
                    sqlStatement = parsedQuery.sqlStatement;
                    queryParameters = parsedQuery.parameters;
                } catch (e) {
                    error = e as Error;
                }
            }
            return { query, parameters, rest, sqlStatement, queryParameters, error };
        });
    }, [queriesInput]);

    useEffect(() => {
        const listeners: (undefined | (() => void))[] = [];
        parsedQueries.forEach((q, idx) => {
            if (q.error || !q.query) return;
            (async () => {
                try {
                    const t = await powerSync.resolveTables(q.sqlStatement, q.queryParameters);
                    setTablesArr((prev) => {
                        if (JSON.stringify(prev[idx]) === JSON.stringify(t)) return prev;
                        const next = prev.slice();
                        next[idx] = t;
                        return next;
                    });
                } catch (e) {
                    setErrorsArr((prev) => {
                        if (prev[idx]?.message === (e as Error).message) return prev;
                        const next = prev.slice();
                        next[idx] = e as Error;
                        return next;
                    });
                }
            })();
            const l = powerSync.registerListener({
                schemaChanged: async () => {
                    try {
                        const t = await powerSync.resolveTables(q.sqlStatement, q.queryParameters);
                        setTablesArr((prev) => {
                            if (JSON.stringify(prev[idx]) === JSON.stringify(t)) return prev;
                            const next = prev.slice();
                            next[idx] = t;
                            return next;
                        });
                        queryClient.invalidateQueries({ queryKey: q.rest.queryKey });
                    } catch (e) {
                        setErrorsArr((prev) => {
                            if (prev[idx]?.message === (e as Error).message) return prev;
                            const next = prev.slice();
                            next[idx] = e as Error;
                            return next;
                        });
                    }
                },
            });
            listeners[idx] = l;
        });

        return () => {
            listeners.forEach((l) => l?.());
        };
    }, [powerSync, parsedQueries, queryClient]);

    useEffect(() => {
        const aborts: AbortController[] = [];
        parsedQueries.forEach((q, idx) => {
            if (q.error || !q.query) return;
            const abort = new AbortController();
            aborts[idx] = abort;
            powerSync.onChangeWithCallback(
                {
                    onChange: () => {
                        queryClient.invalidateQueries({ queryKey: q.rest.queryKey });
                    },
                    onError: (e) => {
                        setErrorsArr((prev) => {
                            if (prev[idx]?.message === (e as Error).message) return prev;
                            const next = prev.slice();
                            next[idx] = e as Error;
                            return next;
                        });
                    },
                },
                {
                    tables: tablesArr[idx],
                    signal: abort.signal,
                }
            );
        });
        return () => aborts.forEach((a) => a?.abort());
    }, [powerSync, parsedQueries, queryClient, tablesArr]);

    const queries = useMemo(() => {
        return parsedQueries.map((q, idx) => {
            const error = q.error || errorsArr[idx];
            const queryFn = async () => {
                if (error) throw error;
                try {
                    return typeof q.query === 'string'
                        ? powerSync.getAll(q.sqlStatement, q.queryParameters)
                        : q.query?.execute();
                } catch (e) {
                    throw e;
                }
            };
            return {
                ...q.rest,
                queryFn: q.query ? queryFn : q.rest.queryFn,
                queryKey: q.rest.queryKey,
            };
        });
    }, [parsedQueries, errorsArr, powerSync]);

    return Tanstack.useQueries(
        {
            queries: queries as Tanstack.QueriesOptions<any>,
            combine: options.combine
                ? (results) => {
                      const enhancedResults = results.map((result, index) => ({
                          ...result,
                          queryKey: queries[index].queryKey,
                      }));

                      return options.combine?.(enhancedResults);
                  }
                : undefined,
        },
        queryClient
    );
}
