import { CompilableQuery } from './../types/types.js';
import { AbstractPowerSyncDatabase, SQLWatchOptions } from './AbstractPowerSyncDatabase.js';
import { runOnSchemaChange } from './runOnSchemaChange.js';

export interface CompilableQueryWatchHandler<T> {
  onResult: (results: T[]) => void;
  onError?: (error: Error) => void;
}

export function compilableQueryWatch<T>(
  db: AbstractPowerSyncDatabase,
  query: CompilableQuery<T>,
  handler: CompilableQueryWatchHandler<T>,
  options?: SQLWatchOptions
): void {
  const { onResult, onError = (e: Error) => {} } = handler ?? {};
  if (!onResult) {
    throw new Error('onResult is required');
  }

  const watchQuery = async (abortSignal: AbortSignal) => {
    try {
      const toSql = query.compile();
      const resolvedTables = await db.resolveTables(toSql.sql, toSql.parameters as [], options);

      // Fetch initial data
      const result = await query.execute();
      onResult(result);

      db.onChangeWithCallback(
        {
          onChange: async () => {
            try {
              const result = await query.execute();
              onResult(result);
            } catch (error: any) {
              onError(error);
            }
          },
          onError
        },
        {
          ...(options ?? {}),
          tables: resolvedTables,
          // Override the abort signal since we intercept it
          signal: abortSignal
        }
      );
    } catch (error: any) {
      onError(error);
    }
  };

  runOnSchemaChange(watchQuery, db, options);
}
