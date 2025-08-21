import { DB, QueryResult, Scalar } from '@op-engineering/op-sqlite';
import { Column, DriverValueDecoder, getTableName, SQL } from 'drizzle-orm';
import { entityKind, is } from 'drizzle-orm/entity';
import type { Logger } from 'drizzle-orm/logger';
import { fillPlaceholders, type Query } from 'drizzle-orm/sql/sql';
import { SQLiteColumn } from 'drizzle-orm/sqlite-core';
import type { SelectedFieldsOrdered } from 'drizzle-orm/sqlite-core/query-builders/select.types';
import {
  ExecuteResultSync,
  type PreparedQueryConfig as PreparedQueryConfigBase,
  type SQLiteExecuteMethod,
  SQLitePreparedQuery
} from 'drizzle-orm/sqlite-core/session';

type PreparedQueryConfig = Omit<PreparedQueryConfigBase, 'statement' | 'run'>;

export class PowerSyncSQLitePreparedQuery<
  T extends PreparedQueryConfig = PreparedQueryConfig
> extends SQLitePreparedQuery<{
  type: 'sync';
  run: QueryResult;
  all: T['all'];
  get: T['get'];
  values: T['values'];
  execute: T['execute'];
}> {
  static readonly [entityKind]: string = 'PowerSyncSQLitePreparedQuery';

  constructor(
    private db: DB,
    query: Query,
    private logger: Logger,
    private fields: SelectedFieldsOrdered | undefined,
    executeMethod: SQLiteExecuteMethod,
    private _isResponseInArrayMode: boolean,
    private customResultMapper?: (rows: unknown[][]) => unknown
  ) {
    super('sync', executeMethod, query);
  }

  execute(placeholderValues?: Record<string, unknown>): ExecuteResultSync<T['execute']> {
    const params = fillPlaceholders(this.query.params, placeholderValues ?? {}) as Scalar[];
    this.logger.logQuery(this.query.sql, params);
    const rs = this.db.executeRawSync(this.query.sql, params);
    return new ExecuteResultSync(() => {
      return this.mapResult(rs, false);
    });
  }

  run(placeholderValues?: Record<string, unknown>): QueryResult {
    const params = fillPlaceholders(this.query.params, placeholderValues ?? {}) as Scalar[];
    this.logger.logQuery(this.query.sql, params);
    const rs = this.db.executeSync(this.query.sql, params);
    return rs;
  }

  all(placeholderValues?: Record<string, unknown>): T['all'] {
    const { fields, query, logger, customResultMapper } = this;
    if (!fields && !customResultMapper) {
      const params = fillPlaceholders(query.params, placeholderValues ?? {}) as Scalar[];
      logger.logQuery(query.sql, params);
      const rs = this.db.executeSync(this.query.sql, params);
      return rs.rows ?? [];
    }

    const rows = this.values(placeholderValues) as unknown[][];

    // if (customResultMapper) {
    //   const mapped = customResultMapper(rows) as T['all'];
    //   return mapped;
    // }
    return rows.map((row) => mapResultRow(fields!, row, (this as any).joinsNotNullableMap));
  }

  get(placeholderValues?: Record<string, unknown>): T['get'] {
    const params = fillPlaceholders(this.query.params, placeholderValues ?? {}) as Scalar[];
    this.logger.logQuery(this.query.sql, params);

    const { fields, customResultMapper } = this;
    const joinsNotNullableMap = (this as any).joinsNotNullableMap;
    if (!fields && !customResultMapper) {
      return this.db.executeSync(this.query.sql, params) as T['get'];
    }

    const rows = this.values(placeholderValues) as unknown[][];
    const row = rows[0];

    if (!row) {
      return undefined;
    }

    // if (customResultMapper) {
    //   return customResultMapper(rows) as T['get'];
    // }

    return mapResultRow(fields!, row, joinsNotNullableMap);
  }

  values(placeholderValues?: Record<string, unknown>): T['values'] {
    const params = fillPlaceholders(this.query.params, placeholderValues ?? {}) as Scalar[];
    this.logger.logQuery(this.query.sql, params);

    return this.db.executeRawSync(this.query.sql, params);
  }

  isResponseInArrayMode(): boolean {
    return this._isResponseInArrayMode;
  }
}

/**
 * Maps a database row object to a result object based on the provided column definitions.
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
