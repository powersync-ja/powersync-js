import { BaseColumnType, Column, ColumnsType, ExtractColumnValueType } from './Column.js';
import { Index } from './Index.js';
import { IndexedColumn } from './IndexedColumn.js';
import { encodeTableOptions } from './internal.js';

/**
 * powersync-sqlite-core limits the number of column per table to 1999, due to internal SQLite limits.
 * In earlier versions this was limited to 63.
 */
const MAX_AMOUNT_OF_COLUMNS = 1999;

/**
 * Options that apply both to JSON-based tables and raw tables.
 *
 * @public
 */
export interface TableOrRawTableOptions {
  localOnly?: boolean;
  insertOnly?: boolean;
  trackPrevious?: boolean | TrackPreviousOptions;
  trackMetadata?: boolean;
  ignoreEmptyUpdates?: boolean;
}

interface SharedTableOptions extends TableOrRawTableOptions {
  viewName?: string;
}

/** Whether to include previous column values when PowerSync tracks local changes.
 *
 * Including old values may be helpful for some backend connector implementations, which is
 * why it can be enabled on per-table or per-columm basis.
 *
 * @public
 */
export interface TrackPreviousOptions {
  /** When defined, a list of column names for which old values should be tracked. */
  columns?: string[];
  /** When enabled, only include values that have actually been changed by an update. */
  onlyWhenChanged?: boolean;
}

/**
 * @public
 */
export interface TableOptions extends SharedTableOptions {
  /**
   * The synced table name, matching sync rules
   */
  name: string;
  columns: Column[];
  indexes?: Index[];
}

/**
 * @public
 */
export type RowType<T extends Table<any>> =
  T extends Table<infer Columns>
    ? { [K in keyof Columns]: ExtractColumnValueType<Columns[K]> } & { id: string }
    : never;

/**
 * @public
 */
export type IndexShorthand = Record<string, (string | IndexedColumn)[]>;

/**
 * @public
 */

export interface TableV2Options extends SharedTableOptions {
  indexes?: IndexShorthand;
}

const DEFAULT_TABLE_OPTIONS = {
  indexes: [],
  insertOnly: false,
  localOnly: false,
  trackPrevious: false,
  trackMetadata: false,
  ignoreEmptyUpdates: false
};

const InvalidSQLCharacters = /["'%,.#\s[\]]/;

/**
 * @internal
 */
export class BaseTable {
  protected options!: TableOptions;

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

  get indexes() {
    return this.options.indexes ?? [];
  }

  get localOnly() {
    return this.options.localOnly!;
  }

  get insertOnly() {
    return this.options.insertOnly!;
  }

  get trackPrevious() {
    return this.options.trackPrevious!;
  }

  get trackMetadata() {
    return this.options.trackMetadata!;
  }

  get ignoreEmptyUpdates() {
    return this.options.ignoreEmptyUpdates!;
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

    if (this.trackMetadata && this.localOnly) {
      throw new Error(`Can't include metadata for local-only tables.`);
    }
    if (this.trackPrevious != false && this.localOnly) {
      throw new Error(`Can't include old values for local-only tables.`);
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
      columns: this.columns.map((c) => c.toJSON()),
      indexes: this.indexes.map((e) => e.toJSON(this)),
      ...encodeTableOptions(this)
    };
  }
}

/**
 * @public
 */
export class Table<Columns extends ColumnsType = ColumnsType> extends BaseTable {
  protected _mappedColumns!: Columns;

  static createLocalOnly<Columns extends ColumnsType = ColumnsType>(columns: Columns, options?: TableV2Options) {
    return new Table(columns, { localOnly: true, insertOnly: false, ...options });
  }

  static createInsertOnly<Columns extends ColumnsType = ColumnsType>(columns: Columns, options?: TableV2Options) {
    return new Table(columns, { localOnly: false, insertOnly: true, ...options });
  }

  /**
   * Creates a new Table instance.
   *
   * This constructor supports two different versions:
   * 1. New constructor: Using a Columns object and an optional TableV2Options object
   * 2. Deprecated constructor: Using a TableOptions object (will be removed in the next major release)
   *
   * @param columns - A Columns object
   * @param options - Optional configuration options for the table.
   *
   * @example
   * ```javascript
   * const table = new Table(
   *   {
   *     name: column.text,
   *     age: column.integer
   *   },
   *   { indexes: { nameIndex: ['name'] } }
   * );
   *```
   */
  constructor(optionsOrColumns: Columns, v2Options?: TableV2Options) {
    super();
    this.initTableV2(optionsOrColumns, v2Options);
  }

  copyWithName(name: string): BaseTable {
    return new CustomTable({ ...this.options, name });
  }

  private initTableV2(columns: Columns, options?: TableV2Options) {
    const convertedColumns = Object.entries(columns).map(
      ([name, columnInfo]) => new Column({ name, type: columnInfo.type })
    );

    const convertedIndexes = Object.entries(options?.indexes ?? {}).map(
      ([name, columnNames]) =>
        new Index({
          name,
          columns: columnNames.map((nameOrIndexedColumn) =>
            typeof nameOrIndexedColumn === 'string'
              ? new IndexedColumn({
                  name: nameOrIndexedColumn.replace(/^-/, ''),
                  ascending: !nameOrIndexedColumn.startsWith('-')
                })
              : nameOrIndexedColumn
          )
        })
    );

    this.options = {
      name: '',
      columns: convertedColumns,
      indexes: convertedIndexes,
      viewName: options?.viewName,
      insertOnly: options?.insertOnly,
      localOnly: options?.localOnly,
      trackPrevious: options?.trackPrevious,
      trackMetadata: options?.trackMetadata,
      ignoreEmptyUpdates: options?.ignoreEmptyUpdates
    };
    this.applyDefaultOptions();

    this._mappedColumns = columns;
  }

  private applyDefaultOptions() {
    this.options.insertOnly ??= DEFAULT_TABLE_OPTIONS.insertOnly;
    this.options.localOnly ??= DEFAULT_TABLE_OPTIONS.localOnly;
    this.options.trackPrevious ??= DEFAULT_TABLE_OPTIONS.trackPrevious;
    this.options.trackMetadata ??= DEFAULT_TABLE_OPTIONS.trackMetadata;
    this.options.ignoreEmptyUpdates ??= DEFAULT_TABLE_OPTIONS.ignoreEmptyUpdates;
  }
}

export class CustomTable extends BaseTable {
  constructor(options: TableOptions) {
    super();
    this.options = options;
  }
}
