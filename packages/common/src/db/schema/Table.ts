import {
  BaseColumnType,
  Column,
  ColumnsType,
  ColumnType,
  ExtractColumnValueType,
  MAX_AMOUNT_OF_COLUMNS
} from './Column.js';
import { Index } from './Index.js';
import { IndexedColumn } from './IndexedColumn.js';
import { TableV2 } from './TableV2.js';

export interface TableOptions {
  /**
   * The synced table name, matching sync rules
   */
  name: string;
  columns: Column[];
  indexes?: Index[];
  localOnly?: boolean;
  insertOnly?: boolean;
  viewName?: string;
}

export type RowType<T extends TableV2<any>> = {
  [K in keyof T['columnMap']]: ExtractColumnValueType<T['columnMap'][K]>;
} & {
  id: string;
};

export type IndexShorthand = Record<string, string[]>;

export interface TableV2Options {
  indexes?: IndexShorthand;
  localOnly?: boolean;
  insertOnly?: boolean;
  viewName?: string;
}

export const DEFAULT_TABLE_OPTIONS = {
  indexes: [],
  insertOnly: false,
  localOnly: false
};

export const InvalidSQLCharacters = /["'%,.#\s[\]]/;

export class Table<Columns extends ColumnsType = ColumnsType> {
  protected options: TableOptions;

  protected _mappedColumns: Columns;

  static createLocalOnly(options: TableOptions) {
    return new Table({ ...options, localOnly: true, insertOnly: false });
  }

  static createInsertOnly(options: TableOptions) {
    return new Table({ ...options, localOnly: false, insertOnly: true });
  }

  /**
   * Create a table.
   * @deprecated This was only only included for TableV2 and is no longer necessary.
   * Prefer to use new Table() directly.
   *
   * TODO remove in the next major release.
   */
  static createTable(name: string, table: Table) {
    return new Table({
      name,
      columns: table.columns,
      indexes: table.indexes,
      localOnly: table.options.localOnly,
      insertOnly: table.options.insertOnly,
      viewName: table.options.viewName
    });
  }

  /**
   * Creates a new Table instance.
   *
   * This constructor supports two different versions:
   * 1. New constructor: Using a Columns object and an optional TableV2Options object
   * 2. Deprecated constructor: Using a TableOptions object (will be removed in the next major release)
   *
   * @constructor
   * @param {Columns | TableOptions} optionsOrColumns - Either a Columns object (for V2 syntax) or a TableOptions object (for V1 syntax)
   * @param {TableV2Options} [v2Options] - Optional configuration options for V2 syntax
   *
   * @example
   * ```javascript
   * // New Constructor
   * const table = new Table(
   *   {
   *     name: column.text,
   *     age: column.integer
   *   },
   *   { indexes: { nameIndex: ['name'] } }
   * );
   *```
   *
   *
   * @example
   * ```javascript
   * // Deprecated Constructor
   * const table = new Table({
   *   name: 'users',
   *   columns: [
   *     new Column({ name: 'name', type: ColumnType.TEXT }),
   *     new Column({ name: 'age', type: ColumnType.INTEGER })
   *   ]
   * });
   *```
   */
  constructor(columns: Columns, options?: TableV2Options);
  /**
   * @deprecated This constructor will be removed in the next major release.
   * Use the new constructor shown below instead as this does not show types.
   * @example
   * <caption>Use this instead</caption>
   * ```javascript
   *   const table = new Table(
   *     {
   *      name: column.text,
   *      age: column.integer
   *     },
   *     { indexes: { nameIndex: ['name'] } }
   *   );
   *```
   */
  constructor(options: TableOptions);
  constructor(optionsOrColumns: Columns | TableOptions, v2Options?: TableV2Options) {
    if (this.isTableV1(optionsOrColumns)) {
      this.initTableV1(optionsOrColumns);
    } else {
      this.initTableV2(optionsOrColumns, v2Options);
    }
  }

  private isTableV1(arg: TableOptions | Columns): arg is TableOptions {
    return 'columns' in arg && Array.isArray(arg.columns);
  }

  private initTableV1(options: TableOptions) {
    this.options = {
      ...options,
      indexes: options.indexes || [],
      insertOnly: options.insertOnly ?? DEFAULT_TABLE_OPTIONS.insertOnly,
      localOnly: options.localOnly ?? DEFAULT_TABLE_OPTIONS.localOnly
    };
  }

  private initTableV2(columns: Columns, options?: TableV2Options) {
    const convertedColumns = Object.entries(columns).map(
      ([name, columnInfo]) => new Column({ name, type: columnInfo.type })
    );

    const convertedIndexes = Object.entries(options?.indexes ?? {}).map(
      ([name, columnNames]) =>
        new Index({
          name,
          columns: columnNames.map(
            (name) =>
              new IndexedColumn({
                name: name.replace(/^-/, ''),
                ascending: !name.startsWith('-')
              })
          )
        })
    );

    this.options = {
      name: '',
      columns: convertedColumns,
      indexes: convertedIndexes,
      insertOnly: options?.insertOnly ?? DEFAULT_TABLE_OPTIONS.insertOnly,
      localOnly: options?.localOnly ?? DEFAULT_TABLE_OPTIONS.localOnly,
      viewName: options?.viewName
    };

    this._mappedColumns = columns;
  }

  get name() {
    return this.options.name;
  }

  get viewNameOverride() {
    return this.options.viewName;
  }

  get viewName() {
    return this.viewNameOverride ?? this.name;
  }

  get columns() {
    return this.options.columns;
  }

  get columnMap(): Columns {
    return (
      this._mappedColumns ??
      this.columns.reduce((hash: Record<string, BaseColumnType<any>>, column) => {
        hash[column.name] = { type: column.type ?? ColumnType.TEXT };
        return hash;
      }, {} as Columns)
    );
  }

  get indexes() {
    return this.options.indexes ?? [];
  }

  get localOnly() {
    return this.options.localOnly ?? false;
  }

  get insertOnly() {
    return this.options.insertOnly ?? false;
  }

  get internalName() {
    if (this.options.localOnly) {
      return `ps_data_local__${this.name}`;
    }

    return `ps_data__${this.name}`;
  }

  get validName() {
    if (InvalidSQLCharacters.test(this.name)) {
      return false;
    }
    if (this.viewNameOverride != null && InvalidSQLCharacters.test(this.viewNameOverride)) {
      return false;
    }
    return true;
  }

  validate() {
    if (InvalidSQLCharacters.test(this.name)) {
      throw new Error(`Invalid characters in table name: ${this.name}`);
    }

    if (this.viewNameOverride && InvalidSQLCharacters.test(this.viewNameOverride!)) {
      throw new Error(`Invalid characters in view name: ${this.viewNameOverride}`);
    }

    if (this.columns.length > MAX_AMOUNT_OF_COLUMNS) {
      throw new Error(`Table has too many columns. The maximum number of columns is ${MAX_AMOUNT_OF_COLUMNS}.`);
    }

    const columnNames = new Set<string>();
    columnNames.add('id');
    for (const column of this.columns) {
      const { name: columnName } = column;
      if (column.name === 'id') {
        throw new Error(`An id column is automatically added, custom id columns are not supported`);
      }
      if (columnNames.has(columnName)) {
        throw new Error(`Duplicate column ${columnName}`);
      }
      if (InvalidSQLCharacters.test(columnName)) {
        throw new Error(`Invalid characters in column name: ${column.name}`);
      }
      columnNames.add(columnName);
    }

    const indexNames = new Set<string>();
    for (const index of this.indexes) {
      if (indexNames.has(index.name)) {
        throw new Error(`Duplicate index ${index.name}`);
      }
      if (InvalidSQLCharacters.test(index.name)) {
        throw new Error(`Invalid characters in index name: ${index.name}`);
      }

      for (const column of index.columns) {
        if (!columnNames.has(column.name)) {
          throw new Error(`Column ${column.name} not found for index ${index.name}`);
        }
      }

      indexNames.add(index.name);
    }
  }

  toJSON() {
    return {
      name: this.name,
      view_name: this.viewName,
      local_only: this.localOnly,
      insert_only: this.insertOnly,
      columns: this.columns.map((c) => c.toJSON()),
      indexes: this.indexes.map((e) => e.toJSON(this))
    };
  }
}
