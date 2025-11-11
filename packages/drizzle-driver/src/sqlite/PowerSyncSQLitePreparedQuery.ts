import type { LockContext, QueryResult } from '@powersync/common';
import { Column, DriverValueDecoder, SQL, getTableName } from 'drizzle-orm';
import type { Cache } from 'drizzle-orm/cache/core';
import type { WithCacheConfig } from 'drizzle-orm/cache/core/types';
import { entityKind, is } from 'drizzle-orm/entity';
import type { Logger } from 'drizzle-orm/logger';
import { fillPlaceholders, type Query } from 'drizzle-orm/sql/sql';
import { SQLiteColumn } from 'drizzle-orm/sqlite-core';
import type { SelectedFieldsOrdered } from 'drizzle-orm/sqlite-core/query-builders/select.types';
import {
  SQLitePreparedQuery,
  type PreparedQueryConfig as PreparedQueryConfigBase,
  type SQLiteExecuteMethod
} from 'drizzle-orm/sqlite-core/session';

type PreparedQueryConfig = Omit<PreparedQueryConfigBase, 'statement' | 'run'>;

/**
 * Callback which uses a LockContext for database operations.
 */
export type LockCallback<T> = (ctx: LockContext) => Promise<T>;

/**
 * Provider for specific database contexts.
 * Handlers are provided a context to the provided callback.
 * This does not necessarily need to acquire a database lock for each call.
 * Calls might use the same lock context for multiple operations.
 * The read/write context may relate to a single read OR write context.
 */
export type ContextProvider = {
  useReadContext: <T>(fn: LockCallback<T>) => Promise<T>;
  useWriteContext: <T>(fn: LockCallback<T>) => Promise<T>;
};

export class PowerSyncSQLitePreparedQuery<
  T extends PreparedQueryConfig = PreparedQueryConfig
> extends SQLitePreparedQuery<{
  type: 'async';
  run: QueryResult;
  all: T['all'];
  get: T['get'];
  values: T['values'];
  execute: T['execute'];
}> {
  static readonly [entityKind]: string = 'PowerSyncSQLitePreparedQuery';

  private readOnly = false;

  constructor(
    private contextProvider: ContextProvider,
    query: Query,
    private logger: Logger,
    private fields: SelectedFieldsOrdered | undefined,
    executeMethod: SQLiteExecuteMethod,
    private _isResponseInArrayMode: boolean,
    private customResultMapper?: (rows: unknown[][]) => unknown,
    cache?: Cache | undefined,
    queryMetadata?:
      | {
          type: 'select' | 'update' | 'delete' | 'insert';
          tables: string[];
        }
      | undefined,
    cacheConfig?: WithCacheConfig | undefined
  ) {
    super('async', executeMethod, query, cache, queryMetadata, cacheConfig);
    this.readOnly = queryMetadata?.type == 'select';
  }

  async run(placeholderValues?: Record<string, unknown>): Promise<QueryResult> {
    const params = fillPlaceholders(this.query.params, placeholderValues ?? {});
    this.logger.logQuery(this.query.sql, params);
    return this.useContext(async (ctx) => {
      const rs = await ctx.execute(this.query.sql, params);
      return rs;
    });
  }

  async all(placeholderValues?: Record<string, unknown>): Promise<T['all']> {
    const { fields, query, logger, customResultMapper } = this;
    if (!fields && !customResultMapper) {
      const params = fillPlaceholders(query.params, placeholderValues ?? {});
      logger.logQuery(query.sql, params);
      return await this.contextProvider.useReadContext(async (ctx) => {
        return await ctx.getAll(this.query.sql, params);
      });
    }

    const rows = (await this.values(placeholderValues)) as unknown[][];
    if (customResultMapper) {
      const mapped = customResultMapper(rows) as T['all'];
      return mapped;
    }
    return rows.map((row) => mapResultRow(fields!, row, (this as any).joinsNotNullableMap));
  }

  async get(placeholderValues?: Record<string, unknown>): Promise<T['get']> {
    const params = fillPlaceholders(this.query.params, placeholderValues ?? {});
    this.logger.logQuery(this.query.sql, params);

    const { fields, customResultMapper } = this;
    const joinsNotNullableMap = (this as any).joinsNotNullableMap;
    if (!fields && !customResultMapper) {
      return this.contextProvider.useReadContext(async (ctx) => {
        return await ctx.get(this.query.sql, params);
      });
    }

    const rows = (await this.values(placeholderValues)) as unknown[][];
    const row = rows[0];

    if (!row) {
      return undefined;
    }

    if (customResultMapper) {
      return customResultMapper(rows) as T['get'];
    }

    return mapResultRow(fields!, row, joinsNotNullableMap);
  }

  async values(placeholderValues?: Record<string, unknown>): Promise<T['values']> {
    const params = fillPlaceholders(this.query.params, placeholderValues ?? {});
    this.logger.logQuery(this.query.sql, params);

    return await this.useContext(async (ctx) => {
      return await ctx.executeRaw(this.query.sql, params);
    });
  }

  isResponseInArrayMode(): boolean {
    return this._isResponseInArrayMode;
  }

  protected useContext<T>(callback: LockCallback<T>): Promise<T> {
    if (this.readOnly) {
      return this.contextProvider.useReadContext(callback);
    } else {
      return this.contextProvider.useWriteContext(callback);
    }
  }
}

/**
 * Maps a flat array of database row values to a result object based on the provided column definitions.
 * It reconstructs the hierarchical structure of the result by following the specified paths for each field.
 * It also handles nullification of nested objects when joined tables are nullable.
 */
export function mapResultRow<TResult>(
  columns: SelectedFieldsOrdered,
  row: unknown[],
  joinsNotNullableMap: Record<string, boolean> | undefined
): TResult {
  // Key -> nested object key, value -> table name if all fields in the nested object are from the same table, false otherwise
  const nullifyMap: Record<string, string | false> = {};

  const result = columns.reduce<Record<string, any>>((result, { path, field }, columnIndex) => {
    const decoder = getDecoder(field);
    let node = result;
    for (const [pathChunkIndex, pathChunk] of path.entries()) {
      if (pathChunkIndex < path.length - 1) {
        if (!(pathChunk in node)) {
          node[pathChunk] = {};
        }
        node = node[pathChunk];
      } else {
        const rawValue = row[columnIndex]!;
        const value = (node[pathChunk] = rawValue === null ? null : decoder.mapFromDriverValue(rawValue));

        updateNullifyMap(nullifyMap, field, path, value, joinsNotNullableMap);
      }
    }
    return result;
  }, {});

  applyNullifyMap(result, nullifyMap, joinsNotNullableMap);

  return result as TResult;
}

/**
 * Determines the appropriate decoder for a given field.
 */
function getDecoder(field: SQLiteColumn | SQL<unknown> | SQL.Aliased): DriverValueDecoder<unknown, unknown> {
  if (is(field, Column)) {
    return field;
  } else if (is(field, SQL)) {
    return (field as any).decoder;
  } else {
    return (field.sql as any).decoder;
  }
}

function updateNullifyMap(
  nullifyMap: Record<string, string | false>,
  field: any,
  path: string[],
  value: any,
  joinsNotNullableMap: Record<string, boolean> | undefined
): void {
  if (!joinsNotNullableMap || !is(field, Column) || path.length !== 2) {
    return;
  }

  const objectName = path[0]!;
  if (!(objectName in nullifyMap)) {
    nullifyMap[objectName] = value === null ? getTableName(field.table) : false;
  } else if (typeof nullifyMap[objectName] === 'string' && nullifyMap[objectName] !== getTableName(field.table)) {
    nullifyMap[objectName] = false;
  }
}

/**
 * Nullify all nested objects from nullifyMap that are nullable
 */
function applyNullifyMap(
  result: Record<string, any>,
  nullifyMap: Record<string, string | false>,
  joinsNotNullableMap: Record<string, boolean> | undefined
): void {
  if (!joinsNotNullableMap || Object.keys(nullifyMap).length === 0) {
    return;
  }

  for (const [objectName, tableName] of Object.entries(nullifyMap)) {
    if (typeof tableName === 'string' && !joinsNotNullableMap[tableName]) {
      result[objectName] = null;
    }
  }
}
