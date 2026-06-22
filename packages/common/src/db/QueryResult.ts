/**
 * A SQLite value, either text, a number, a blob value or null.
 *
 * @public
 */
export type SqliteValue = string | number | bigint | number[] | Uint8Array | null;

/**
 * A record of SQLite values representing a row.
 *
 * @public
 */
export type SqliteRecord = Record<string, SqliteValue>;

/**
 * A representation of query results as JavaScript object.
 *
 * @public
 */
export interface ResultSet {
  /**
   * The amount of rows in the result set.
   */
  get length(): number;

  /**
   * @deprecated Use {@link QueryResult.array} instead.
   */
  get _array(): any[];

  /**
   * @deprecated Use {@link QueryResult.array} instead.
   */
  item<T>(idx: number): T;
}

/**
 * Shared superinterface for {@link QueryResult} and {@link RawQueryResult}.
 *
 * @public
 */
export interface BaseQueryResult {
  /** Represents the auto-generated row id if applicable. */
  insertId?: number;
  /**
   * Number of affected rows reported by SQLite for a write query.
   *
   * When using the default client-side [JSON-based view system](https://docs.powersync.com/architecture/client-architecture#client-side-schema-and-sqlite-database-structure),
   * `rowsAffected` may be `0` for successful `UPDATE` and `DELETE` statements.
   * Use a `RETURNING` clause and inspect `rows` when you need to confirm which rows changed.
   */
  rowsAffected?: number;
}

/**
 * Object returned by SQL Query executions.
 *
 * @public
 */
export interface QueryResult<T = SqliteRecord> extends BaseQueryResult, Iterable<T, undefined> {
  /**
   * If the query returned rows, the result set containing returned values.
   */
  rows?: ResultSet;
  /**
   * Rows in this result set.
   */
  array: T[];
}

/**
 * A raw array-based result set representing rows returned by SQLite.
 *
 * @public
 */
export interface RawQueryResult extends BaseQueryResult {
  /**
   * Names of columns in this result set. Every column has a name, so the length of this array is always equal to the
   * amount of columns in the result set.
   *
   * Note that column names are not necessarily unique, e.g. a `SELECT foo.user, bar.user FROM ...` will have
   * `['user', 'user']` in this array.
   */
  columnNames: string[];

  /**
   * Rows in the result set.
   *
   * Each row has a length equal to {@link RawQueryResult.columnNames}.
   */
  rawRows: SqliteValue[][];
}

function rowToRecord<T>(columnNames: string[], row: SqliteValue[]) {
  const record: SqliteRecord = {};
  columnNames.forEach((name, idx) => (record[name] = row[idx]));
  return record as T;
}

/**
 * Creates a query result by mapping raw rows to JavaScript.
 *
 * This should not be used with libraries doing this mapping natively, as that is typically more performant.
 *
 * @public
 */
export function queryResultFromRaw<T>(raw: RawQueryResult): QueryResult<T> {
  const { insertId, rowsAffected, columnNames, rawRows } = raw;
  let array: any[] | undefined;

  function loadAsArray() {
    if (array) return array;

    return (array = rawRows.map((row) => rowToRecord(columnNames, row)));
  }

  function getRow<T>(idx: number) {
    if (array) return array[idx];
    return rowToRecord(columnNames, rawRows[idx]);
  }

  return {
    insertId,
    rowsAffected,
    get array() {
      return loadAsArray();
    },
    rows: {
      length: rawRows.length,
      get _array() {
        return loadAsArray();
      },
      item: getRow
    } satisfies ResultSet,
    [Symbol.iterator](): Iterator<T> {
      let nextIndex = 0;

      return {
        next: function (): IteratorResult<T, any> {
          if (nextIndex >= rawRows.length) {
            return { done: true, value: undefined };
          }

          const row = getRow(nextIndex);
          nextIndex++;
          return { done: false, value: row };
        }
      };
    }
  };
}

/**
 * Creates a query result from rows that have already been mapped to JavaScript.
 *
 * @public
 */
export function queryResultFromMapped<T>(base: BaseQueryResult, rows?: T[]): QueryResult<T> {
  if (rows == null) return queryResultWithoutRows(base);

  return {
    insertId: base.insertId,
    rowsAffected: base.rowsAffected,
    array: rows ?? [],
    rows: {
      length: rows.length,
      _array: rows,
      item(i: number) {
        return rows[i] as any;
      }
    } satisfies ResultSet,
    [Symbol.iterator](): Iterator<T> {
      return rows[Symbol.iterator]();
    }
  };
}

/**
 * Creates a {@link QueryResult} not containing any rows.
 *
 * @public
 */
export function queryResultWithoutRows(result: BaseQueryResult): QueryResult<never> {
  return {
    ...result,
    array: [],
    [Symbol.iterator](): Iterator<never> {
      return {
        next() {
          return { done: true, value: undefined };
        }
      };
    }
  };
}
