import { type CompilableQuery, parseQuery } from '@powersync/common';
import { QuerySyncStreamOptions, useAllSyncStreamsHaveSynced, usePowerSync } from '@powersync/react';
import { useEffect, useState, useCallback, useMemo } from 'react';
import * as Tanstack from '@tanstack/react-query';

export type UsePowerSyncQueriesInput = {
  query?: string | CompilableQuery<unknown>;
  parameters?: unknown[];
  queryKey: Tanstack.QueryKey;
  streams?: QuerySyncStreamOptions[];
}[];

export type UsePowerSyncQueriesOutput = {
  queries: {
    sqlStatement: string;
    queryParameters: unknown[];
    tables: string[];
    error?: Error;
    queryFn: () => Promise<unknown[]>;
  }[];
  streamsHaveSynced: boolean;
};

export function usePowerSyncQueries(
  queries: UsePowerSyncQueriesInput,
  queryClient: Tanstack.QueryClient
): UsePowerSyncQueriesOutput {
  const powerSync = usePowerSync();

  const [tablesArr, setTablesArr] = useState<string[][]>(() => queries.map(() => []));
  const [errorsArr, setErrorsArr] = useState<(Error | undefined)[]>(() => queries.map(() => undefined));

  const updateTablesArr = useCallback((tables: string[], idx: number) => {
    setTablesArr((prev) => {
      if (JSON.stringify(prev[idx]) === JSON.stringify(tables)) return prev;
      const next = [...prev];
      next[idx] = tables;
      return next;
    });
  }, []);

  // Collect all streams from all query entries into a single flat list for sync tracking.
  const allStreams = useMemo(() => {
    const streams = queries.flatMap(q => q.streams ?? []);
    return streams.length > 0 ? streams : undefined;
  }, [queries]);

  const streamsHaveSynced = useAllSyncStreamsHaveSynced(powerSync, allStreams);

  const updateErrorsArr = useCallback((error: Error | undefined, idx: number) => {
    setErrorsArr((prev) => {
      if (prev[idx]?.message === error?.message) return prev;
      const next = [...prev];
      next[idx] = error;
      return next;
    });
  }, []);

  const parsedQueries = useMemo(
    () =>
      queries.map((queryInput) => {
        const { query, parameters = [], queryKey } = queryInput;

        if (!query) {
          return {
            query,
            parameters,
            queryKey,
            sqlStatement: '',
            queryParameters: [],
            parseError: undefined
          };
        }

        try {
          const parsed = parseQuery(query, parameters);
          return {
            query,
            parameters,
            queryKey,
            sqlStatement: parsed.sqlStatement,
            queryParameters: parsed.parameters,
            parseError: undefined
          };
        } catch (e) {
          return {
            query,
            parameters,
            queryKey,
            sqlStatement: '',
            queryParameters: [],
            parseError: e as Error
          };
        }
      }),
    [queries]
  );

  useEffect(() => {
    parsedQueries.forEach((pq, idx) => {
      if (pq.parseError) {
        updateErrorsArr(pq.parseError, idx);
      }
    });
  }, [parsedQueries, updateErrorsArr]);

  const stringifiedQueriesDeps = JSON.stringify(
    parsedQueries.map((q) => ({
      sql: q.sqlStatement,
      params: q.queryParameters
    }))
  );

  useEffect(() => {
    const listeners = parsedQueries.map((pq, idx) => {
      if (pq.parseError || !pq.query) {
        return null;
      }

      (async () => {
        try {
          const tables = await powerSync.resolveTables(pq.sqlStatement, pq.queryParameters);
          updateTablesArr(tables, idx);
        } catch (e) {
          updateErrorsArr(e as Error, idx);
        }
      })();

      return powerSync.registerListener({
        schemaChanged: async () => {
          try {
            const tables = await powerSync.resolveTables(pq.sqlStatement, pq.queryParameters);
            updateTablesArr(tables, idx);
            queryClient.invalidateQueries({ queryKey: pq.queryKey });
          } catch (e) {
            updateErrorsArr(e as Error, idx);
          }
        }
      });
    });

    return () => {
      listeners.forEach((l) => l?.());
    };
  }, [powerSync, queryClient, stringifiedQueriesDeps, updateTablesArr, updateErrorsArr]);

  const stringifiedQueryKeys = JSON.stringify(parsedQueries.map((q) => q.queryKey));

  useEffect(() => {
    const aborts = parsedQueries.map((pq, idx) => {
      if (pq.parseError || !pq.query) {
        return null;
      }

      const abort = new AbortController();

      powerSync.onChangeWithCallback(
        {
          onChange: () => {
            queryClient.invalidateQueries({ queryKey: pq.queryKey });
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

  return useMemo(() => {

    return {
      queries: parsedQueries.map((pq, idx) => {
        const error = errorsArr[idx] || pq.parseError;
  
        const queryFn = async () => {
          if (error) throw error;
          if (!pq.query) throw new Error('No query provided');
  
          try {
            return typeof pq.query === 'string'
              ? await powerSync.getAll(pq.sqlStatement, pq.queryParameters)
              : await pq.query.execute();
          } catch (e) {
            throw e;
          }
        };
  
        return {
          sqlStatement: pq.sqlStatement,
          queryParameters: pq.queryParameters,
          tables: tablesArr[idx],
          error,
          queryFn
        };
      }),
      streamsHaveSynced
    };
  }, [parsedQueries, errorsArr, tablesArr, powerSync]);
}
