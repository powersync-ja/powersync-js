/**
 * @see https://www.sqlite.org/lang_expr.html#castexpr
 * @public
 */
export enum ColumnType {
  TEXT = 'TEXT',
  INTEGER = 'INTEGER',
  REAL = 'REAL'
}

/**
 * @public
 */
export interface ColumnOptions {
  name: string;
  type?: ColumnType;
}

/**
 * @public
 */
export type BaseColumnType<T extends number | string | null> = {
  type: ColumnType;
};

/**
 * @public
 */
export type ColumnsType = Record<string, BaseColumnType<any>>;

/**
 * @public
 */
export type ExtractColumnValueType<T extends BaseColumnType<any>> = T extends BaseColumnType<infer R> ? R : unknown;

const text: BaseColumnType<string | null> = {
  type: ColumnType.TEXT
};

const integer: BaseColumnType<number | null> = {
  type: ColumnType.INTEGER
};

const real: BaseColumnType<number | null> = {
  type: ColumnType.REAL
};

/**
 * powersync-sqlite-core limits the number of column per table to 1999, due to internal SQLite limits.
 * In earlier versions this was limited to 63.
 *
 * @internal
 */
export const MAX_AMOUNT_OF_COLUMNS = 1999;

/**
 * @public
 */
export const column = {
  text,
  integer,
  real
};

/**
 * @public
 */
export class Column {
  constructor(protected options: ColumnOptions) {}

  get name() {
    return this.options.name;
  }

  get type() {
    return this.options.type;
  }

  toJSON() {
    return {
      name: this.name,
      type: this.type
    };
  }
}
